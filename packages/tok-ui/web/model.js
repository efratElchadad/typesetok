export const MAX_TEXT = 500_000;
export const defaults = {font:'serif',size:14,leading:1.8,align:'justify',direction:'rtl',spacing:12,indent:false,paper:'A4',orientation:'portrait',margin:22,numbers:true,guides:false};
export const sample = '# מקום למילים שלך\n\nכל ספר מתחיל ברעיון אחד. משפט שמבקש להיכתב, סיפור שמחכה למצוא את מקומו על הדף.\n\nTypesetOK מעניקה לטקסט שלך מרחב נקי: כתיבה רציפה בצד אחד, ותצוגת המסמך בצד השני. בחרי גופן, התאימי את השוליים ותני למילים לנשום.\n\n## מתחילים בפשטות\n\nאפשר לשנות את הטקסט הזה, לפתוח קובץ משלך, או להתחיל מסמך חדש. השינויים נשמרים כטיוטה מקומית בדפדפן. לשמירת עותק משלך, לחצי על שמירת קובץ.\n\n## הקצב של העמוד\n\nכותרות נכתבות עם # בתחילת שורה. הוסיפי --- בשורה נפרדת כדי להתחיל עמוד חדש. כלי העיצוב משפיעים על כל המסמך ושומרים על מראה עקבי.\n\nזה המקום לכתוב את הדבר הבא.';
export function validateDraft(value) {
  if (!value || value.format !== 'tokdraft' || value.version !== 1 || typeof value.text !== 'string' || value.text.length > MAX_TEXT || typeof value.title !== 'string' || value.title.length > 120) throw Error('קובץ טיוטה לא תקין או גדול מדי');
  const settings = {...defaults};
  const enums = {font:['serif','sans-serif','monospace'],align:['justify','right','left','center'],direction:['rtl','ltr'],paper:['A4','A5','Letter'],orientation:['portrait','landscape']};
  const bounds = {size:[9,36],leading:[1,3],spacing:[0,32],margin:[10,35]};
  if (!value.settings || typeof value.settings !== 'object') throw Error('חסרות הגדרות עיצוב');
  for (const key of Object.keys(defaults)) {
    const v = value.settings[key];
    if (v === undefined) continue;
    if (enums[key] ? !enums[key].includes(v) : bounds[key] ? typeof v !== 'number' || !Number.isFinite(v) || v < bounds[key][0] || v > bounds[key][1] : typeof v !== 'boolean') throw Error('הגדרת עיצוב לא תקינה');
    settings[key] = v;
  }
  return {format:'tokdraft',version:1,title:value.title,text:value.text,settings};
}
export function stats(text) { return {words:text.trim() ? text.trim().split(/\s+/u).length : 0,characters:[...text].length,paragraphs:text.split(/\n\s*\n/u).filter(s=>s.trim()).length}; }
export function countMatches(text, query) { if (!query) return 0; let count=0, pos=0; while((pos=text.indexOf(query,pos))!==-1){count++;pos+=query.length;} return count; }
export function transform(text, action) {
  if(action==='normalize') return text.normalize('NFC');
  if(action==='spaces') return text.replace(/[ \t]+/g,' ').replace(/^ +| +$/gm,'').replace(/\n{3,}/g,'\n\n');
  if(action==='niqqud') return text.replace(/[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g,'');
  if(action==='marks') return text.replace(/[\u0591-\u05AF]/g,'');
  return text;
}
export class History {
  constructor(initial){this.items=[initial];this.index=0;this.bytes=initial.length;}
  push(value){if(value===this.items[this.index])return;this.items=this.items.slice(0,this.index+1);this.items.push(value);this.bytes=this.items.reduce((n,s)=>n+s.length,0);while(this.items.length>2&&(this.items.length>60||this.bytes>4_000_000))this.bytes-=this.items.shift().length;this.index=this.items.length-1;}
  undo(){if(this.index>0)this.index--;return this.items[this.index];}
  redo(){if(this.index<this.items.length-1)this.index++;return this.items[this.index];}
}
