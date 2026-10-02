const {chromium} = require(process.env.TOK_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1600,height:1050}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('packages/tok-ui/dist/TypesetOK.html'));
  const tool=async id=>{await page.click('[data-action="tools"]');await page.click(`[data-tool="${id}"]`);};
  const select=async selector=>page.evaluate(selector=>{
   const el=document.querySelector(selector), r=document.createRange();r.selectNodeContents(el);r.collapse(true);
   document.querySelector('#editor').focus();const s=getSelection();s.removeAllRanges();s.addRange(r);
  },selector);
  await select('#editor p'); await tool('paragraphLTR');
  assert.equal(await page.locator('#editor p').first().getAttribute('dir'),'ltr');
  await page.click('[data-action="undo"]');assert.equal(await page.locator('#editor p').first().getAttribute('dir'),null);
  await page.click('[data-action="redo"]');assert.equal(await page.locator('#editor p').first().getAttribute('dir'),'ltr');
  await page.waitForTimeout(850);await page.reload();assert.equal(await page.locator('#editor p').first().getAttribute('dir'),'ltr');
  await select('#editor p'); const count=await page.locator('#editor>p').count();await tool('duplicateParagraph');
  assert.equal(await page.locator('#editor>p').count(),count+1);
  await select('#editor p'); const paragraph=await page.locator('#editor>p').first().innerText();await tool('moveParagraphDown');
  assert.equal(await page.locator('#editor>p').nth(1).innerText(),paragraph);
  await tool('readingView');const before=await page.locator('#editor').innerHTML();
  assert.equal(await page.locator('#editor').getAttribute('contenteditable'),'false');
  assert.equal(await page.locator('#title').evaluate(el=>el.readOnly),true);
  await tool('toc');assert.equal(await page.locator('#editor').innerHTML(),before);
  await page.click('[data-action="palette"]');await page.getByRole('button',{name:'הסרת תווי רוחב אפס',exact:true}).click();
  assert.equal(await page.locator('#editor').innerHTML(),before);
  await page.click('#reading-banner button');
  await select('#editor p');await tool('toc');assert.ok((await page.locator('#editor').innerText()).includes('תוכן עניינים'));
  await page.click('[data-tab="insert"]');await page.click('[data-action="table"]');await page.click('#modal-body .save-button');
  await select('#editor td');await tool('deleteColumn');assert.equal(await page.locator('#editor tr').first().locator('th,td').count(),2);
  await select('#editor td');await tool('headerRow');assert.equal(await page.locator('#editor tr').nth(1).locator('th').count(),2);
  await select('#editor th');await page.keyboard.type('=1+2');
  const pending=page.waitForEvent('download');await tool('tableCSV');const csv=fs.readFileSync(await (await pending).path(),'utf8');
  assert.ok(csv.includes('"\'=1+2"'));
  await tool('sepia');await tool('contrast');await tool('compact');await page.waitForTimeout(850);await page.reload();
  assert.ok(await page.locator('body').evaluate(el=>['sepia','contrast','compact'].every(c=>el.classList.contains(c))));
  await page.click('[data-action="tools"]');assert.equal(await page.locator('[data-tool]').count(),23);
  await page.fill('[aria-label="חיפוש במרכז הכלים"]','טבלאות');assert.equal(await page.locator('[data-tool]').count(),3);
  await page.fill('[aria-label="חיפוש במרכז הכלים"]','');await page.screenshot({path:'/tmp/typesetok-tools.png'});
  await page.click('[data-action="closeModal"]');await page.screenshot({path:'/tmp/typesetok-studio04.png'});
  await page.setViewportSize({width:1100,height:800});await page.click('[data-action="tools"]');
  assert.equal(await page.locator('#modal').evaluate(el=>el.getBoundingClientRect().right<=innerWidth),true);
  assert.deepEqual(errors,[]);console.log('Studio tools passed: direction roundtrip and undo, paragraph editing, reading guards, TOC, table structure, CSV formula protection, persisted views, responsive tool center.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
