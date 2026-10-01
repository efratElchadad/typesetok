// Optional integration check: requires Playwright and a Chromium installation.
const { chromium } = require(process.env.TOK_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:process.env.TOK_CHROMIUM||undefined,args:['--no-sandbox']});
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('file://'+path.resolve('packages/tok-ui/dist/TypesetOK.html'));
 await page.locator('.page h1').waitFor();
 await page.screenshot({path:process.env.TOK_SCREENSHOT||'/tmp/typesetok-editor.png',fullPage:true});
 const editor=page.locator('#editor');
 await editor.fill('# כותרת בדיקה\n\nשלום עולם שלום\n\n<script>window.pwned=1</script>');
 await page.waitForTimeout(850);
 assert.equal(await page.locator('.page script').count(),0);
 assert.equal(await page.evaluate(()=>window.pwned),undefined);
 await page.click('[data-action="search"]');await page.fill('#query','שלום');await page.fill('#replacement','ברכה');
 await page.click('[data-action="replaceAll"]');await page.waitForTimeout(250);
 assert.ok((await editor.inputValue()).includes('ברכה עולם ברכה'));
 await page.click('[data-action="undo"]');assert.ok((await editor.inputValue()).includes('שלום עולם שלום'));
 await page.click('[data-action="redo"]');assert.ok((await editor.inputValue()).includes('ברכה עולם ברכה'));
 await page.selectOption('#paper','A5');await page.waitForTimeout(250);assert.equal(await page.locator('.page').first().evaluate(e=>e.style.width),'148mm');
 const saving=page.waitForEvent('download');await page.click('[data-action="save"]');const download=await saving;const saved=await download.path();
 await page.setInputFiles('#file',saved);await page.waitForTimeout(300);
 // Temp download paths have no extension; JSON draft detection still succeeds.
 assert.ok((await editor.inputValue()).includes('ברכה עולם ברכה'));
 await page.click('[data-action="theme"]');assert.ok(await page.locator('body').evaluate(e=>e.classList.contains('dark')));
 await page.click('[data-action="focus"]');assert.ok(await page.locator('body').evaluate(e=>e.classList.contains('focus')));await page.keyboard.press('Escape');
 await editor.evaluate(el=>{el.select();const data=new DataTransfer();data.setData('text/plain','טקסט ארוך '.repeat(5000));el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});await page.waitForTimeout(300);assert.equal((await editor.inputValue()).length,'טקסט ארוך '.repeat(5000).length);
 await page.setInputFiles('#file',{name:'long.txt',mimeType:'text/plain',buffer:Buffer.from('שלום עולם\n\n'.repeat(12000))});await page.waitForTimeout(1000);
 assert.ok(await page.locator('#preview .page p').count()<=3600);
 assert.ok((await page.locator('#preview').innerText()).includes('תצוגה מקוצרת'));
 assert.ok(await page.locator('#preview').evaluate(e=>e.textContent.length)<32000);
 const exporting=page.waitForEvent('download');await page.click('[data-action="html"]');const html=await exporting;const fs=require('node:fs');assert.ok(fs.readFileSync(await html.path(),'utf8').length>100000);
 await page.reload();assert.equal((await editor.inputValue()).length,'שלום עולם\n\n'.repeat(12000).length);
 assert.deepEqual(errors,[]);
 console.log('Browser checks passed: offline load, XSS text safety, search/replace, undo/redo, formatting, draft download/import, theme, focus, bounded preview, full export, autosave restore.');
 await browser.close();
})().catch(error=>{console.error(String(error).slice(0,1000));process.exit(1);});
