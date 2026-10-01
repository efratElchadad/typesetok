import { readFile, mkdir, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url),
  source = new URL("packages/tok-ui/web/", root),
  dest = new URL("packages/tok-ui/dist/", root);
await mkdir(dest, { recursive: true });
for (const name of ["index.html", "style.css", "app.js", "model.js"])
  await copyFile(new URL(name, source), new URL(name, dest));
const html = await readFile(new URL("index.html", source), "utf8"),
  css = await readFile(new URL("style.css", source), "utf8");
const js =
  (await readFile(new URL("model.js", source), "utf8")).replace(
    /^export /gm,
    "",
  ) +
  "\n" +
  (await readFile(new URL("app.js", source), "utf8")).replace(
    /^import[\s\S]*?from ['"]\.\/model\.js['"];?\r?\n/,
    "",
  );
const hash = createHash("sha256").update(js).digest("base64");
const standalone = html
  .replace("script-src 'self'", `script-src 'sha256-${hash}'`)
  .replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`)
  .replace(
    '<script type="module" src="app.js"></script>',
    `<script type="module">${js}</script>`,
  );
await writeFile(new URL("TypesetOK.html", dest), standalone);
console.log(
  `Built offline editor: ${Buffer.byteLength(standalone).toLocaleString()} bytes, no runtime dependencies.`,
);
