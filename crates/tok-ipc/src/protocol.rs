use serde::{Deserialize, Serialize};
use tok_core::anchor::TextAnchor;
use tok_core::id::NodeId;
use tok_core::transaction::CompoundTransaction;

/// High-speed binary IPC command sent from UI frontend to Rust Core.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum IpcCommand {
    InsertText {
        anchor: TextAnchor,
        text: String,
    },
    DeleteRange {
        start: TextAnchor,
        end: TextAnchor,
    },
    ApplyTransaction {
        transaction: CompoundTransaction,
    },
    QueryGeometry {
        page_index: u32,
    },
    HitTest {
        page_index: u32,
        x_pt: f32,
        y_pt: f32,
    },
    RequestRender {
        format: String, // "pdf" or "html"
        output_path: String,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GlyphGeometry {
    pub cluster: u32,
    pub x_pt: f32,
    pub y_pt: f32,
    pub width_pt: f32,
    pub height_pt: f32,
    pub character: Option<char>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LineGeometry {
    pub line_index: u32,
    pub baseline_y_pt: f32,
    pub height_pt: f32,
    pub text: String,
    pub glyphs: Vec<GlyphGeometry>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PageGeometryPayload {
    pub page_index: u32,
    pub gematria_number: String,
    pub width_pt: f32,
    pub height_pt: f32,
    pub lines: Vec<LineGeometry>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HitTestResult {
    pub node_id: NodeId,
    pub char_offset: usize,
    pub visual_x_pt: f32,
    pub visual_y_pt: f32,
    pub line_index: usize,
}

/// High-speed binary IPC event sent from Rust Core to UI frontend.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum IpcEvent {
    TransactionApplied {
        revision: u64,
        affected_pages: Vec<u32>,
    },
    GeometryUpdate {
        page: PageGeometryPayload,
    },
    HitTestResponse(HitTestResult),
    RenderCompleted {
        output_path: String,
        bytes_count: usize,
    },
    Error {
        code: u32,
        message: String,
    },
}

/// Binary message framing (4-byte length prefix + payload).
pub struct MessageFramer;

impl MessageFramer {
    /// Maximum serialized message size; applies in both directions.
    pub const MAX_PAYLOAD_BYTES: usize = 8 * 1024 * 1024;

    fn framing_error(message: &str) -> serde_json::Error {
        serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            message,
        ))
    }

    fn payload(bytes: &[u8]) -> Result<&[u8], serde_json::Error> {
        let header: [u8; 4] = bytes
            .get(..4)
            .ok_or_else(|| Self::framing_error("Missing frame header"))?
            .try_into()
            .unwrap();
        let length = u32::from_le_bytes(header) as usize;
        if length > Self::MAX_PAYLOAD_BYTES || length != bytes.len() - 4 {
            return Err(Self::framing_error("Invalid frame length"));
        }
        Ok(&bytes[4..])
    }

    fn frame(payload: Vec<u8>) -> Result<Vec<u8>, serde_json::Error> {
        if payload.len() > Self::MAX_PAYLOAD_BYTES {
            return Err(Self::framing_error("Message exceeds size limit"));
        }
        let mut framed = Vec::with_capacity(4 + payload.len());
        framed.extend_from_slice(&(payload.len() as u32).to_le_bytes());
        framed.extend_from_slice(&payload);
        Ok(framed)
    }

    pub fn encode_command(cmd: &IpcCommand) -> Result<Vec<u8>, serde_json::Error> {
        let payload = serde_json::to_vec(cmd)?;
        Self::frame(payload)
    }

    pub fn decode_command(bytes: &[u8]) -> Result<IpcCommand, serde_json::Error> {
        serde_json::from_slice(Self::payload(bytes)?)
    }

    pub fn encode_event(evt: &IpcEvent) -> Result<Vec<u8>, serde_json::Error> {
        let payload = serde_json::to_vec(evt)?;
        Self::frame(payload)
    }

    pub fn decode_event(bytes: &[u8]) -> Result<IpcEvent, serde_json::Error> {
        serde_json::from_slice(Self::payload(bytes)?)
    }
}

#[cfg(test)]
mod framing_security_tests {
    use super::*;

    #[test]
    fn rejects_incomplete_mismatched_and_concatenated_frames() {
        let valid =
            MessageFramer::encode_command(&IpcCommand::QueryGeometry { page_index: 0 }).unwrap();
        for length in 0..valid.len() {
            assert!(MessageFramer::decode_command(&valid[..length]).is_err());
        }
        let mut bad = valid.clone();
        bad[..4].copy_from_slice(&0u32.to_le_bytes());
        assert!(MessageFramer::decode_command(&bad).is_err());
        let mut joined = valid.clone();
        joined.extend_from_slice(&valid);
        assert!(MessageFramer::decode_command(&joined).is_err());
        assert!(MessageFramer::decode_command(&u32::MAX.to_le_bytes()).is_err());
    }

    #[test]
    fn event_decoder_validates_length_and_encoder_limits_payloads() {
        let event = IpcEvent::Error {
            code: 1,
            message: "test".into(),
        };
        let mut framed = MessageFramer::encode_event(&event).unwrap();
        framed.push(0);
        assert!(MessageFramer::decode_event(&framed).is_err());
        let oversized = IpcEvent::Error {
            code: 1,
            message: "x".repeat(MessageFramer::MAX_PAYLOAD_BYTES),
        };
        assert!(MessageFramer::encode_event(&oversized).is_err());
    }
}
