use crate::error::StorageError;
use crate::migration::{MigrationPipeline, CURRENT_SCHEMA_VERSION};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use tok_core::model::{DocumentModel, DocumentRoot};
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

// Bounds include uncompressed data, not just the small compressed ZIP size.
const MAX_ARCHIVE_BYTES: u64 = 256 * 1024 * 1024;
const MAX_ENTRY_BYTES: u64 = 64 * 1024 * 1024;
const MAX_MANIFEST_BYTES: u64 = 1024 * 1024;
const MAX_TOTAL_BYTES: u64 = 256 * 1024 * 1024;
const MAX_ENTRIES: usize = 4096;

fn safe_member_name(name: &str) -> bool {
    !name.is_empty()
        && !name.contains(['\\', ':', '\0'])
        && name
            .split('/')
            .all(|part| !part.is_empty() && part != "." && part != "..")
}

fn read_bounded(reader: impl Read, limit: u64) -> Result<Vec<u8>, StorageError> {
    let mut bytes = Vec::new();
    reader.take(limit + 1).read_to_end(&mut bytes)?;
    if bytes.len() as u64 > limit {
        return Err(StorageError::CorruptedPackage(
            "Entry exceeds size limit".into(),
        ));
    }
    Ok(bytes)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokManifest {
    pub schema_version: String,
    pub document_id: String,
    pub title: String,
    pub author: String,
    pub created_at: String,
    pub modified_at: String,
    pub master_book_id: Option<String>,
    pub embedded_assets: Vec<String>,
    pub page_count: u32,
    #[serde(default)]
    pub custom_metadata: HashMap<String, String>,
}

impl Default for TokManifest {
    fn default() -> Self {
        Self {
            schema_version: CURRENT_SCHEMA_VERSION.to_string(),
            document_id: tok_core::id::Ulid::new().to_string(),
            title: "מסמך חדש".to_string(),
            author: "מחבר".to_string(),
            created_at: "2026-09-30T12:00:00Z".to_string(),
            modified_at: "2026-09-30T12:00:00Z".to_string(),
            master_book_id: None,
            embedded_assets: Vec::new(),
            page_count: 0,
            custom_metadata: HashMap::new(),
        }
    }
}

pub struct TokPackage {
    pub manifest: TokManifest,
    pub assets: HashMap<String, Vec<u8>>,
    pub previews: HashMap<String, Vec<u8>>,
}

impl Default for TokPackage {
    fn default() -> Self {
        Self::new()
    }
}

impl TokPackage {
    pub fn new() -> Self {
        Self {
            manifest: TokManifest::default(),
            assets: HashMap::new(),
            previews: HashMap::new(),
        }
    }

    /// Adds an embedded binary asset (e.g. image, SVG) to the package.
    pub fn add_asset(&mut self, relative_path: impl Into<String>, data: Vec<u8>) {
        let path = relative_path.into();
        if !self.manifest.embedded_assets.contains(&path) {
            self.manifest.embedded_assets.push(path.clone());
        }
        self.assets.insert(path, data);
    }

    /// Adds a page preview thumbnail.
    pub fn add_preview(&mut self, page_num: u32, data: Vec<u8>) {
        self.previews.insert(format!("page_{}.png", page_num), data);
    }

    /// Saves the DocumentModel and package assets atomically to a `.tok` file.
    /// Implements Section 11.2: write to `.tmp`, flush to disk, atomic rename/replace.
    pub fn save_atomic(
        &mut self,
        doc: &DocumentModel,
        path: impl AsRef<Path>,
    ) -> Result<(), StorageError> {
        for name in self.assets.keys().chain(self.previews.keys()) {
            if !safe_member_name(name) {
                return Err(StorageError::CorruptedPackage(
                    "Unsafe asset or preview name".into(),
                ));
            }
        }
        let dest_path = path.as_ref();
        let parent = dest_path.parent().unwrap_or_else(|| Path::new("."));
        fs::create_dir_all(parent)?;

        let tmp_path = parent.join(format!(
            "{}.tmp_{}",
            dest_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("doc"),
            tok_core::id::Ulid::new()
        ));

        // Sync manifest with document root
        let root = doc.root();
        self.manifest.title = root.metadata.title.clone();
        self.manifest.author = root.metadata.author.clone();
        self.manifest.document_id = root.id.to_string();

        // 1. Write archive to temporary file
        {
            let file = File::create(&tmp_path)?;
            let mut zip = ZipWriter::new(file);
            let options =
                SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

            // Write manifest.json
            zip.start_file("manifest.json", options)?;
            let manifest_bytes = serde_json::to_vec_pretty(&self.manifest)?;
            zip.write_all(&manifest_bytes)?;

            // Write document.json
            zip.start_file("document.json", options)?;
            let doc_bytes = serde_json::to_vec_pretty(root)?;
            zip.write_all(&doc_bytes)?;

            // Write embedded assets
            for (asset_name, asset_bytes) in &self.assets {
                let asset_path = format!("assets/{}", asset_name);
                zip.start_file(asset_path, options)?;
                zip.write_all(asset_bytes)?;
            }

            // Write page preview thumbnails
            for (preview_name, preview_bytes) in &self.previews {
                let preview_path = format!("previews/{}", preview_name);
                zip.start_file(preview_path, options)?;
                zip.write_all(preview_bytes)?;
            }

            let mut finished_file = zip.finish()?;
            // 2. Full hardware flush to disk
            finished_file.flush()?;
            finished_file.sync_all()?;
        }

        // 3. Atomic replacement
        if dest_path.exists() {
            #[cfg(windows)]
            {
                let backup_path = parent.join(format!(
                    "{}.bak",
                    dest_path.file_name().unwrap().to_str().unwrap()
                ));
                if backup_path.exists() {
                    let _ = fs::remove_file(&backup_path);
                }
                fs::rename(dest_path, &backup_path)?;
                if let Err(e) = fs::rename(&tmp_path, dest_path) {
                    let _ = fs::rename(&backup_path, dest_path);
                    return Err(StorageError::AtomicSaveFailed(e.to_string()));
                }
                let _ = fs::remove_file(backup_path);
            }
            #[cfg(not(windows))]
            {
                fs::rename(&tmp_path, dest_path)?;
            }
        } else {
            fs::rename(&tmp_path, dest_path)?;
        }

        Ok(())
    }

    /// Opens and extracts a `.tok` archive into a DocumentModel and TokPackage container.
    pub fn open(path: impl AsRef<Path>) -> Result<(DocumentModel, Self), StorageError> {
        let file = File::open(path)?;
        if file.metadata()?.len() > MAX_ARCHIVE_BYTES {
            return Err(StorageError::CorruptedPackage(
                "Archive exceeds size limit".into(),
            ));
        }
        let mut archive = ZipArchive::new(file)?;
        if archive.len() > MAX_ENTRIES {
            return Err(StorageError::CorruptedPackage(
                "Too many archive entries".into(),
            ));
        }
        let mut total = 0u64;
        for i in 0..archive.len() {
            let entry = archive.by_index(i)?;
            let name = entry.name();
            let checked_name = if entry.is_dir() {
                name.strip_suffix('/').unwrap_or(name)
            } else {
                name
            };
            if !safe_member_name(checked_name) {
                return Err(StorageError::CorruptedPackage("Unsafe archive name".into()));
            }
            let limit = if name == "manifest.json" {
                MAX_MANIFEST_BYTES
            } else {
                MAX_ENTRY_BYTES
            };
            if entry.size() > limit || entry.size() > MAX_TOTAL_BYTES - total {
                return Err(StorageError::CorruptedPackage(
                    "Uncompressed package exceeds size limit".into(),
                ));
            }
            total += entry.size();
        }

        // 1. Read and validate manifest.json
        let manifest_str = {
            let manifest_file = archive
                .by_name("manifest.json")
                .map_err(|_| StorageError::CorruptedPackage("Missing manifest.json".into()))?;
            read_bounded(manifest_file, MAX_MANIFEST_BYTES)?
        };
        let manifest: TokManifest = serde_json::from_slice(&manifest_str)?;

        MigrationPipeline::validate_version(&manifest.schema_version)?;

        // 2. Read document.json
        let doc_str = {
            let doc_file = archive
                .by_name("document.json")
                .map_err(|_| StorageError::CorruptedPackage("Missing document.json".into()))?;
            read_bounded(doc_file, MAX_ENTRY_BYTES)?
        };
        let doc_json: serde_json::Value = serde_json::from_slice(&doc_str)?;
        let migrated_doc_json = MigrationPipeline::migrate_document_json(doc_json)?;
        let root: DocumentRoot = serde_json::from_value(migrated_doc_json)?;

        // 3. Read assets and previews
        let mut assets = HashMap::new();
        let mut previews = HashMap::new();

        let num_files = archive.len();
        for i in 0..num_files {
            let file = archive.by_index(i)?;
            let name = file.name().to_string();
            if name.starts_with("assets/") && !name.ends_with('/') {
                let asset_key = name.strip_prefix("assets/").unwrap().to_string();
                let limit = file.size().min(MAX_ENTRY_BYTES);
                let data = read_bounded(file, limit)?;
                assets.insert(asset_key, data);
            } else if name.starts_with("previews/") && !name.ends_with('/') {
                let preview_key = name.strip_prefix("previews/").unwrap().to_string();
                let limit = file.size().min(MAX_ENTRY_BYTES);
                let data = read_bounded(file, limit)?;
                previews.insert(preview_key, data);
            }
        }

        let package = Self {
            manifest,
            assets,
            previews,
        };

        Ok((DocumentModel::new(root), package))
    }
}

#[cfg(test)]
mod security_tests {
    use super::*;

    #[test]
    fn rejects_unsafe_names_on_read_and_write() {
        for name in [
            "../escape",
            "/absolute",
            "C:/file",
            "a\\b",
            "a/../b",
            "a//b",
        ] {
            assert!(!safe_member_name(name), "{name}");
        }
        assert!(safe_member_name("images/כריכה.png"));
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("unsafe.tok");
        let mut zip = ZipWriter::new(File::create(&path).unwrap());
        zip.start_file("assets/../escape", SimpleFileOptions::default())
            .unwrap();
        zip.finish().unwrap();
        assert!(matches!(
            TokPackage::open(&path),
            Err(StorageError::CorruptedPackage(_))
        ));
        let original = fs::read(&path).unwrap();
        let mut package = TokPackage::new();
        package.add_asset("../escape", vec![]);
        let document = DocumentModel::new(DocumentRoot::new("test"));
        assert!(package.save_atomic(&document, &path).is_err());
        assert_eq!(fs::read(&path).unwrap(), original);
    }

    #[test]
    fn rejects_compressed_oversized_manifest() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("large.tok");
        let mut zip = ZipWriter::new(File::create(&path).unwrap());
        zip.start_file(
            "manifest.json",
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated),
        )
        .unwrap();
        zip.write_all(&vec![b' '; MAX_MANIFEST_BYTES as usize + 1])
            .unwrap();
        zip.finish().unwrap();
        assert!(matches!(
            TokPackage::open(path),
            Err(StorageError::CorruptedPackage(_))
        ));
    }

    #[test]
    fn bounded_reader_checks_actual_output() {
        assert_eq!(read_bounded(&b"1234"[..], 4).unwrap(), b"1234");
        assert!(read_bounded(&b"12345"[..], 4).is_err());
    }
}
