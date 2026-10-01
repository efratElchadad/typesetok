import { mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const output = new URL('desktop-stage/', root);
await rm(output, { recursive: true, force: true });
for (const file of ['packages/tok-electron/dist/main.js', 'packages/tok-ui/dist/TypesetOK.html', 'LICENSE.md']) {
  const target = new URL(file, output);
  await mkdir(new URL('./', target), { recursive: true });
  await copyFile(new URL(file, root), target);
}
const source = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
await writeFile(new URL('package.json', output), JSON.stringify({
  name: 'typesetok', productName: 'TypesetOK', version: source.version,
  description: 'Hebrew writing and layout editor', author: 'TypesetOK',
  license: 'SEE LICENSE IN LICENSE.md', main: 'packages/tok-electron/dist/main.js',
}, null, 2));
console.log('Prepared minimal desktop payload (no workspace or development dependencies).');
