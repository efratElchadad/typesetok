import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,validateDraft,History,transform,countMatches,stats,MAX_TEXT} from '../packages/tok-ui/web/model.js';
const draft=()=>({format:'tokdraft',version:1,title:'בדיקה',text:'שלום',settings:{...defaults}});
test('draft round trips without losing Hebrew',()=>assert.deepEqual(validateDraft(JSON.parse(JSON.stringify(draft()))),draft()));
test('rejects untrusted formatting and oversized input',()=>{
 for(const settings of [{size:NaN},{size:100},{font:'url(https://example.com)'},{direction:'bad'},{numbers:'yes'},{margin:-1}])assert.throws(()=>validateDraft({...draft(),settings}));
 assert.throws(()=>validateDraft({...draft(),version:2}));assert.throws(()=>validateDraft({...draft(),text:'x'.repeat(MAX_TEXT+1)}));
});
test('history truncates redo branches and is bounded',()=>{const h=new History('a');h.push('b');h.push('c');assert.equal(h.undo(),'b');assert.equal(h.redo(),'c');h.undo();h.push('d');assert.equal(h.redo(),'d');for(let i=0;i<100;i++)h.push('x'.repeat(100000)+i);assert.ok(h.items.length<=60);assert.ok(h.bytes<=4_000_000);});
test('Hebrew cleanup preserves letters and separates cantillation from vowels',()=>{assert.equal(transform('שָׁלוֹם','niqqud'),'שלום');assert.equal(transform('בָּ֑','marks'),'בָּ');assert.equal(transform('a  b\n\n\n c  ','spaces'),'a b\n\nc');});
test('literal search counts, empty queries, and unicode stats',()=>{assert.equal(countMatches('a.* a.*','.*'),2);assert.equal(countMatches('aaa',''),0);assert.equal(stats('שלום עולם').words,2);assert.equal(stats('😀').characters,1);});
test('optional text cleanup preserves Hebrew marks and intentional interior spaces',()=>{
 assert.equal(transform('  שָׁלוֹם  עולם \n\tnext\t','trimLines'),'שָׁלוֹם  עולם\nnext');
 assert.equal(transform('שָׁ\u200bלוֹ\u200dם\ufeff','removeInvisible'),'שָׁלוֹם');
 assert.equal(transform('Abc שלום','upperCase'),'ABC שלום');
 assert.equal(transform('ABC שלום','lowerCase'),'abc שלום');
});
