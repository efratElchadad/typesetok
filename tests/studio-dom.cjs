// DOM-only fallback: does not validate browser editing commands or visual layout.
const {JSDOM}=require(process.env.TOK_JSDOM || 'jsdom');
const fs=require('node:fs'), assert=require('node:assert/strict');
const base='packages/tok-ui/web/';
const dom=new JSDOM(fs.readFileSync(base+'index.html','utf8'),{url:'https://typesetok.test',runScripts:'outside-only'});
const w=dom.window;
w.structuredClone=structuredClone;
Object.defineProperty(w.HTMLElement.prototype,'innerText',{get(){return this.textContent},set(v){this.textContent=v}});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
w.HTMLDialogElement.prototype.close=function(){this.open=false};
w.document.queryCommandState=()=>false;
w.HTMLElement.prototype.scrollIntoView=()=>{};
w.assert=assert;
const model=fs.readFileSync(base+'model.js','utf8').replace(/^export /gm,'');
const app=fs.readFileSync(base+'app.js','utf8').replace(/^import[\s\S]*?from ["']\.\/model\.js["'];?\r?\n/,'');
try{
 w.eval(model+'\n'+app+`\n
 const pick = selector => { const r=document.createRange(); r.selectNodeContents(editor.querySelector(selector)); r.collapse(true);setRange(r); };
 editor.innerHTML='<h1>בדיקה</h1><p>שלום <b>עולם</b></p><p>Second</p>';
 pick('p');actions.paragraphLTR();assert.equal(editor.querySelector('p').dir,'ltr');
 actions.undo();assert.equal(editor.querySelector('p').dir,'');actions.redo();assert.equal(editor.querySelector('p').dir,'ltr');
 assert.ok(studioDocument(capture()).html.includes('dir="ltr"'));
 pick('p');actions.duplicateParagraph();assert.equal(editor.querySelectorAll('p').length,3);
 pick('p');actions.moveParagraphUp();assert.equal(editor.firstElementChild.tagName,'P');actions.moveParagraphDown();assert.equal(editor.firstElementChild.tagName,'H1');
 actions.tools();assert.equal(document.querySelectorAll('[data-tool]').length,23);closeModal();
 const original=editor.innerHTML;actions.readingView();runAction('duplicateParagraph');assert.equal(editor.innerHTML,original);
 assert.equal($('title').readOnly,true);assert.equal(editor.contentEditable,'false');actions.readingView();assert.equal($('title').readOnly,false);
 editor.innerHTML='<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>';
 pick('td');actions.deleteColumn();assert.equal(editor.querySelectorAll('td').length,2);
 pick('td');actions.headerRow();assert.equal(editor.querySelectorAll('th').length,1);
 actions.undo();assert.equal(editor.querySelectorAll('th').length,0);
 const safe=cleanHTML('<p dir="rtl" onclick="alert(1)">טקסט</p><script>alert(1)</script><img src=x onerror="alert(1)">');
 assert.equal(safe,'<p dir="rtl">טקסט</p>');
 actions.sepia();assert.equal(localStorage.getItem('typesetok.studio.view.sepia'),'true');
 persist();assert.equal(JSON.parse(localStorage.getItem(storageKey)).documents.length,1);
 `);
 console.log('DOM checks passed: workbench, paragraph direction/undo/serialization, paragraph movements, read-only guard, table editing, sanitization, persistence. Browser layout and execCommand are not covered.');
}finally{w.close();}
