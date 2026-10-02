import {
  defaults,
  sample,
  stats,
  countMatches,
  transform,
  History,
  cleanHTML,
  textToHTML,
  plainText,
  studioDocument,
} from "./model.js";
const $ = (id) => document.getElementById(id),
  editor = $("editor");
const icons = {
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1",
  focus: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  help: "M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  undo: "M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12",
  redo: "M16 5l5 5-5 5m5-5H10a6 6 0 0 0 0 12",
  eraser: "m9 4-7 9 7 7h5l8-10-7-7zM6 9l9 8M9 20h13",
  highlight: "m15 3 6 6-9 9H6v-6zM3 21h18",
  "align-right": "M3 5h18M9 10h12M3 15h18M9 20h12",
  "align-left": "M3 5h18M3 10h12M3 15h18M3 20h12",
  "align-center": "M3 5h18M6 10h12M3 15h18M6 20h12",
  "align-justify": "M3 5h18M3 10h18M3 15h18M3 20h18",
  list: "M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1",
  ordered: "M9 5h12M9 12h12M9 19h12M3 3v4m-1 5c3-3 4 1 0 3h3",
  indent: "M3 4h18M10 10h11M10 15h11M3 21h18m0-12 4 4-4 4",
  outdent: "M3 4h18M10 10h11M10 15h11M3 21h18M7 9l-4 4 4 4",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6",
  history: "M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v6l4 2",
  table: "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18",
  plus: "M12 4v16M4 12h16",
  minus: "M4 12h16",
  trash: "M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  pages: "M5 3h14v7M5 14v7h14v-7M2 12h20",
  type: "M3 4h18M12 4v17m-4 0h8",
  calendar: "M3 5h18v16H3zM7 2v6m10-6v6M3 10h18",
  check: "m4 12 5 5L20 6",
  folder: "M3 5h7l2 3h9v12H3z",
  copy: "M8 8h13v13H8zM16 8V3H3v13h5",
  fit: "M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M8 12h8",
  printer: "M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6z",
  close: "m5 5 14 14M5 19 19 5",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z",
  code: "m8 5-6 7 6 7m8-14 6 7-6 7m-3-17-2 20",
  file: "M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8",
};
function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(svg.namespaceURI, "path");
  p.setAttribute("d", icons[name] || icons.file);
  svg.append(p);
  return svg;
}
for (const el of document.querySelectorAll("[data-icon]"))
  el.prepend(icon(el.dataset.icon));
// Shared labels keep the tool center and keyboard palette in sync.
const studioTools = {
  paragraphRTL: ["פסקה מימין לשמאל", "עריכה"],
  paragraphLTR: ["פסקה משמאל לימין", "עריכה"],
  superscript: ["כתב עילי", "עריכה"], subscript: ["כתב תחתי", "עריכה"],
  selectDocument: ["בחירת כל תוכן המסמך", "עריכה"],
  duplicateParagraph: ["שכפול הפסקה הנוכחית", "עריכה"],
  moveParagraphUp: ["העברת הפסקה למעלה", "עריכה"],
  moveParagraphDown: ["העברת הפסקה למטה", "עריכה"],
  deleteColumn: ["מחיקת עמודה בטבלה", "טבלאות"],
  headerRow: ["הפיכת שורה לכותרת טבלה", "טבלאות"],
  tableCSV: ["ייצוא הטבלה הנוכחית ל־CSV", "טבלאות"],
  toc: ["הוספת תוכן עניינים מכותרות", "מסמך"],
  outlineTXT: ["ייצוא מתאר כותרות לטקסט", "מסמך"],
  hebrewDate: ["הוספת תאריך עברי", "מסמך"],
  nbsp: ["הוספת רווח קשיח", "מסמך"],
  trimLines: ["ניקוי רווחים בקצות שורות", "ניקוי טקסט"],
  removeInvisible: ["הסרת תווי רוחב אפס", "ניקוי טקסט"],
  upperCase: ["אותיות לטיניות גדולות", "ניקוי טקסט"],
  lowerCase: ["אותיות לטיניות קטנות", "ניקוי טקסט"],
  readingView: ["תצוגת קריאה בלבד", "תצוגה"],
  sepia: ["שולחן עבודה בגוון נייר", "תצוגה"],
  contrast: ["ניגודיות מוגברת", "תצוגה"],
  compact: ["סרגל כלים קומפקטי", "תצוגה"],
};
const storageKey = "typesetok.studio.v1";
let collection = [],
  current = "",
  draft,
  history,
  savedRange = null,
  dirty = false,
  zoom = 0.9,
  saveTimer,
  renderTimer,
  toastTimer,
  typingTimer,
  composing = false,
  lastInput = 0;
let savedToFile = false,
  storageLocked = false;
const printStyle = document.createElement("style");
document.head.append(printStyle);
const newId = () =>
  globalThis.crypto?.randomUUID?.() ||
  Date.now().toString(36) + Math.random().toString(36).slice(2);
function newDocument(title = "מסמך חדש", html = "<p><br></p>") {
  return studioDocument({
    format: "tokdoc",
    version: 1,
    title,
    html,
    settings: { ...defaults, align: "right" },
    notes: "",
    goal: 1000,
  });
}
const welcome =
  '<h1>לכל מילה<br>יש מקום.</h1><p><span style="color:#8895a9">מחברת רעיונות · מהדורה ראשונה</span></p><p>כתיבה טובה מתחילה במרחב שמאפשר לה להתרחש. דף שמחכה למחשבה הראשונה, קצב בין השורות, ומקום לכל מה שעוד יבוא.</p><h2>לחשוב דרך המילים</h2><p>זהו מסמך חי. אפשר לערוך אותו ישירות, לבחור מילה ולהדגיש, להוסיף כותרת או לבנות טבלה. הכלים סביב הדף מאפשרים לעצב את התוכן ולהישאר קרובים אליו.</p><blockquote>״אין צורך לדעת מראש את כל הסיפור.<br>לפעמים מספיק למצוא את המשפט הראשון.״</blockquote><h2>בונים את הפרק הבא</h2><p>בצד ימין נמצאים המסמכים והמתאר. בצד שמאל — סגנונות, הערות ונקודות שחזור. שמרי נקודה לפני שינוי גדול, וחזרי אליה כשצריך.</p><ul><li>בחרי סגנון שייתן למסמך אופי.</li><li>הוסיפי מחשבה, רעיון או התחלה של פרק.</li><li>שמרי עותק לקובץ כדי לקחת אותו איתך.</li></ul>';
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 3500);
}
function capture() {
  draft.title = $("title").value || "מסמך ללא שם";
  draft.html = cleanHTML(editor.innerHTML);
  draft.notes = $("notes").value;
  const goal = Number($("goal").value);
  draft.goal =
    Number.isInteger(goal) && goal >= 0 && goal <= 100000 ? goal : 1000;
  return draft;
}
function historyState() {
  return JSON.stringify({
    html: cleanHTML(editor.innerHTML),
    settings: draft.settings,
  });
}
function checkpoint() {
  history.push(historyState());
  updateUndo();
}
function updateUndo() {
  $("undo").disabled = history.index === 0;
  $("redo").disabled = history.index === history.items.length - 1;
}
function persist() {
  clearTimeout(saveTimer);
  try {
    if (storageLocked) throw Error("האחסון הישן לא נטען");
    capture();
    const item = collection.find((d) => d.id === current);
    if (item) {
      item.doc = structuredClone(draft);
      item.updated = Date.now();
    }
    const serialized = JSON.stringify({ current, documents: collection });
    if (serialized.length > 3500000) throw Error("אחסון מלא");
    localStorage.setItem(storageKey, serialized);
    $("save-state").textContent =
      "נשמר במכשיר · " +
      new Date().toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    dirty = false;
  } catch {
    dirty = true;
    $("save-state").textContent = "הטיוטה לא נשמרה במכשיר — שמרי קובץ";
  }
  renderDocuments();
}
function changed() {
  dirty = true;
  savedToFile = false;
  $("save-state").textContent = "שומר שינויים…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 700);
  clearTimeout(renderTimer);
  renderTimer = setTimeout(refresh, 180);
}
function dimensions() {
  const [w, h] = { A4: [210, 297], A5: [148, 210], Letter: [216, 279] }[
    draft.settings.paper
  ];
  return draft.settings.orientation === "landscape" ? [h, w] : [w, h];
}
function applyStyle() {
  for (const [id, value] of Object.entries(draft.settings)) {
    if ($(id)) {
      if (typeof value === "boolean") $(id).checked = value;
      else $(id).value = String(value);
    }
  }
  const s = draft.settings,
    [w, h] = dimensions(),
    paper = document.querySelector(".paper");
  Object.assign(paper.style, {
    width: w + "mm",
    minHeight: h + "mm",
    padding: s.margin + "mm",
  });
  paper.style.setProperty("--spacing", s.spacing + "px");
  paper.style.setProperty("--indent", s.indent ? "1.5em" : "0");
  paper.classList.toggle("guides", s.guides);
  Object.assign(editor.style, {
    fontFamily: s.font,
    fontSize: s.size + "pt",
    lineHeight: String(s.leading),
    textAlign: s.align,
  });
  editor.dir = s.direction;
  paper.dir = s.direction;
  $("folio").hidden = !s.numbers;
  $("paper-stack").style.zoom = String(zoom);
  $("zoom-label").textContent = Math.round(zoom * 100) + "%";
  printStyle.textContent = `@page{size:${s.paper} ${s.orientation};margin:${s.margin}mm}`;
}
function sync() {
  clearTimeout(typingTimer);
  editor.innerHTML = draft.html;
  $("title").value = draft.title;
  $("notes").value = draft.notes;
  $("goal").value = draft.goal;
  for (const [id, value] of Object.entries(draft.settings)) {
    if (!$(id)) continue;
    if (typeof value === "boolean") $(id).checked = value;
    else $(id).value = String(value);
  }
  history = new History(historyState());
  savedRange = null;
  applyStyle();
  refresh();
  renderDocuments();
  renderSnapshots();
}
function safeOpen(id) {
  persist();
  if (dirty && !confirm("השמירה המקומית נכשלה. לעבור בכל זאת?")) return;
  const item = collection.find((d) => d.id === id);
  if (!item) return;
  current = id;
  draft = studioDocument(item.doc);
  sync();
  persist();
}
function renderDocuments() {
  const frag = document.createDocumentFragment();
  const query = $("library-query").value.trim().toLocaleLowerCase("he");
  const items = collection.filter(item => {
    const doc = item.id === current ? capture() : item.doc;
    return (doc.title + " " + plainText(doc.html)).toLocaleLowerCase("he").includes(query);
  }).sort((a, b) => $("library-sort").value === "title"
    ? a.doc.title.localeCompare(b.doc.title, "he") : b.updated - a.updated);
  for (const item of items) {
    const button = document.createElement("button");
    button.className = "doc-card" + (item.id === current ? " active" : "");
    const thumb = document.createElement("span");
    thumb.className = "doc-thumbnail";
    thumb.append(icon("file"));
    const text = document.createElement("span"),
      name = document.createElement("strong"),
      info = document.createElement("small");
    name.textContent = item.id === current ? draft.title : item.doc.title;
    info.textContent =
      new Date(item.updated).toLocaleDateString("he-IL") + " · מסמך";
    text.append(name, info);
    button.append(thumb, text);
    button.addEventListener("click", () => safeOpen(item.id));
    frag.append(button);
  }
  if (!items.length) frag.append(textElement("p", "לא נמצאו מסמכים התואמים לחיפוש."));
  $("library-count").textContent = `${items.length} מתוך ${collection.length} מסמכים`;
  $("documents").replaceChildren(frag);
}
function refresh() {
  const text = editor.innerText;
  const s = stats(text);
  $("stats").textContent =
    `${s.words.toLocaleString("he-IL")} מילים · ${s.characters.toLocaleString("he-IL")} תווים · ${editor.querySelectorAll("table").length} טבלאות`;
  $("word-count").textContent = s.words.toLocaleString("he-IL");
  const goal = Number($("goal").value) || 0;
  const percent = goal ? Math.round((s.words / goal) * 100) : 0;
  $("goal-progress").value = Math.min(100, percent);
  $("goal-percent").textContent = goal ? percent + "%" : "ללא יעד";
  $("breadcrumb").textContent = $("title").value;
  $("running-title").textContent = $("title").value;
  const frag = document.createDocumentFragment();
  for (const el of [...editor.querySelectorAll("h1,h2,h3")].slice(0, 100)) {
    const button = document.createElement("button");
    button.dataset.level = el.tagName.slice(1);
    button.textContent = el.textContent;
    button.addEventListener("click", () => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      const r = document.createRange();
      r.selectNodeContents(el);
      setRange(r);
    });
    frag.append(button);
  }
  if (!frag.childNodes.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "כותרות המסמך יופיעו כאן. בחרי פסקה והחילי סגנון כותרת.";
    frag.append(p);
  }
  $("outline").replaceChildren(frag);
  $("matches").textContent = $("query").value
    ? countMatches(editor.textContent, $("query").value) + " התאמות"
    : "";
  updateUndo();
}
function renderSnapshots() {
  const frag = document.createDocumentFragment();
  for (const point of collection.find((d) => d.id === current)?.snapshots ||
    []) {
    const button = document.createElement("button");
    button.textContent =
      new Date(point.time).toLocaleString("he-IL") + " — שחזור";
    button.addEventListener("click", () => {
      if (!confirm("לשחזר את התוכן והעיצוב מנקודה זו? אפשר לבטל את השחזור."))
        return;
      if (document.body.classList.contains("reading-view")) return toast("חזרי למצב עריכה כדי לשחזר");
      checkpoint();
      const restored = studioDocument(point.doc);
      draft.settings = restored.settings;
      editor.innerHTML = restored.html;
      for (const [id, value] of Object.entries(draft.settings)) {
        if ($(id)) {
          if (typeof value === "boolean") $(id).checked = value;
          else $(id).value = String(value);
        }
      }
      checkpoint();
      applyStyle();
      changed();
      toast("נקודת השחזור נטענה");
    });
    frag.append(button);
  }
  $("snapshots").replaceChildren(frag);
}
function selectionInEditor() {
  const sel = window.getSelection();
  return (
    sel?.rangeCount &&
    editor.contains(sel.anchorNode) &&
    editor.contains(sel.focusNode)
  );
}
function remember() {
  if (selectionInEditor())
    savedRange = window.getSelection().getRangeAt(0).cloneRange();
}
function setRange(range) {
  editor.focus();
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  savedRange = range.cloneRange();
}
function restore() {
  editor.focus();
  if (savedRange && editor.contains(savedRange.commonAncestorContainer))
    setRange(savedRange);
  else {
    const r = document.createRange();
    r.selectNodeContents(editor);
    r.collapse(false);
    setRange(r);
  }
}
function transact(command, value = null) {
  checkpoint();
  restore();
  document.execCommand(command, false, value);
  remember();
  checkpoint();
  changed();
}
function insert(html) {
  const safe = cleanHTML(html);
  if (editor.innerHTML.length + safe.length > 500000)
    return toast("המסמך הגיע למגבלת הגודל");
  transact("insertHTML", safe);
}
function modal(title, content) {
  $("modal-title").textContent = title;
  $("modal-body").replaceChildren(content);
  $("modal").showModal();
}
function closeModal() {
  $("modal").close();
}
function textElement(tag, text) {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}
function download(extension, content, type) {
  const name =
      (draft.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 100) ||
        "document") + extension,
    url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function addDocument(doc) {
  if (collection.length >= 10)
    return toast("עד 10 מסמכים מקומיים. שמרי קובץ ומחקי טיוטה שאינך צריכה.");
  persist();
  if (dirty && !confirm("השמירה המקומית נכשלה. לעבור בכל זאת?")) return;
  current = newId();
  draft = doc;
  collection.push({
    id: current,
    doc: structuredClone(doc),
    updated: Date.now(),
    snapshots: [],
  });
  sync();
  changed();
  persist();
}
function activeCell() {
  restore();
  let node = window.getSelection()?.anchorNode;
  const el = node?.nodeType === 1 ? node : node?.parentElement;
  const cell = el?.closest("td,th");
  return cell && editor.contains(cell) ? cell : null;
}
function tableEdit(action) {
  checkpoint();
  const cell = activeCell();
  if (!cell) return toast("מקמי את הסמן בתוך תא בטבלה");
  const table = cell.closest("table"),
    row = cell.closest("tr");
  if (action === "row") {
    if (table.rows.length >= 30) return toast("עד 30 שורות בטבלה");
    const added = table.insertRow(row.rowIndex + 1);
    for (let i = 0; i < row.cells.length; i++)
      added.insertCell().append(document.createElement("br"));
  }
  if (action === "column") {
    if (row.cells.length >= 10) return toast("עד 10 עמודות בטבלה");
    for (const r of table.rows) {
      const c = r.insertCell(Math.min(cell.cellIndex + 1, r.cells.length));
      c.append(document.createElement("br"));
    }
  }
  if (action === "deleteRow") {
    if (table.rows.length === 1) table.remove();
    else row.remove();
  }
  if (action === "deleteColumn") {
    if ([...table.querySelectorAll("td,th")].some(c => c.colSpan > 1 || c.rowSpan > 1))
      return toast("מחיקת עמודה אינה זמינה בטבלה עם תאים ממוזגים");
    const index = cell.cellIndex;
    for (const r of [...table.rows]) if (r.cells[index]) r.deleteCell(index);
    if (![...table.rows].some(r => r.cells.length)) table.remove();
  }
  if (action === "headerRow") {
    for (const c of [...row.cells]) {
      const replacement = document.createElement("th");
      replacement.innerHTML = c.innerHTML;
      replacement.colSpan = c.colSpan; replacement.rowSpan = c.rowSpan;
      replacement.style.cssText = c.style.cssText;
      if (c.dir) replacement.dir = c.dir;
      c.replaceWith(replacement);
    }
  }
  if (action === "deleteTable") table.remove();
  savedRange = null;
  checkpoint();
  changed();
}
function textNodes() {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  return nodes;
}
function findNext() {
  const q = $("query").value;
  if (!q) return toast("הקלידי טקסט לחיפוש");
  const nodes = textNodes(),
    text = nodes.map((n) => n.textContent).join("");
  let start = 0;
  if (savedRange && editor.contains(savedRange.endContainer)) {
    for (const node of nodes) {
      if (node === savedRange.endContainer) {
        start += savedRange.endOffset;
        break;
      }
      start += node.length;
    }
  }
  let pos = text.indexOf(q, start);
  if (pos < 0) pos = text.indexOf(q);
  if (pos < 0) return toast("לא נמצאו התאמות");
  let offset = 0,
    a,
    b;
  for (const node of nodes) {
    if (!a && pos < offset + node.length) a = [node, pos - offset];
    if (pos + q.length <= offset + node.length) {
      b = [node, pos + q.length - offset];
      break;
    }
    offset += node.length;
  }
  if (a && b) {
    const r = document.createRange();
    r.setStart(...a);
    r.setEnd(...b);
    setRange(r);
    a[0].parentElement.scrollIntoView({ block: "center" });
  }
  refresh();
}
function replaceAll() {
  const q = $("query").value,
    rep = $("replacement").value;
  if (!q) return;
  const n = countMatches(editor.textContent, q);
  if (editor.innerHTML.length + n * Math.max(0, rep.length - q.length) > 500000)
    return toast("התוצאה גדולה מדי");
  checkpoint();
  let replaced = 0;
  for (const node of textNodes()) {
    replaced += countMatches(node.textContent, q);
    node.textContent = node.textContent.split(q).join(rep);
  }
  savedRange = null;
  checkpoint();
  changed();
  toast(
    `הוחלפו ${replaced} מופעים. ביטוי שחוצה עיצובים שונים אפשר להחליף דרך ״הבא״.`,
  );
}
function exportHTML() {
  capture();
  const doc = document.implementation.createHTMLDocument(draft.title);
  doc.documentElement.lang = "he";
  doc.documentElement.dir = draft.settings.direction;
  const meta = doc.createElement("meta");
  meta.charset = "utf-8";
  doc.head.append(meta);
  const policy = doc.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content =
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'";
  doc.head.append(policy);
  const style = doc.createElement("style");
  const [w, h] = dimensions(),
    s = draft.settings;
  style.textContent = `body{font-family:${s.font};font-size:${s.size}pt;line-height:${s.leading};text-align:${s.align};padding:${s.margin}mm;margin:auto;max-width:${w}mm;color:#25364b}p{margin:0 0 ${s.spacing}px;text-indent:${s.indent ? "1.5em" : "0"}}h1{font-size:2.4em;line-height:1.3}h2{font-size:1.35em}blockquote{border-inline-start:3px solid #9aabd8;padding:10px 20px;background:#f6f8fd}table{border-collapse:collapse;width:100%;table-layout:fixed}td,th{border:1px solid #cad4e2;padding:9px}th{background:#f0f3fa}.page-break{break-after:page;border:0}@page{size:${s.paper} ${s.orientation};margin:${s.margin}mm}@media print{body{padding:0;max-width:none}h1,h2{break-after:avoid}p{orphans:3;widows:3}}`;
  doc.head.append(style);
  doc.body.innerHTML = cleanHTML(draft.html);
  return "<!doctype html>\n" + doc.documentElement.outerHTML;
}
const templates = [
  ["מאמר", "כתיבה ועריכה", "תקציר|מבוא|גוף המאמר|סיכום", "serif"],
  ["פרק בספר", "כתיבה ועריכה", "פתיחה|התפתחות|מחשבות לסיום", "serif"],
  ["דף לימוד", "לימוד", "נושא הלימוד|מקורות|שאלות לעיון|סיכום", "serif"],
  ["מערך שיעור", "לימוד", "מטרות|ציוד והכנה|פתיחה|מהלך השיעור|הערכה", "sans-serif"],
  ["סיכום פגישה", "עבודה", "משתתפים|נושאים לדיון|החלטות|משימות להמשך", "sans-serif"],
  ["הצעת פרויקט", "עבודה", "רקע וצורך|מטרות|תכולת העבודה|לוח זמנים|מדדי הצלחה", "sans-serif"],
  ["מכתב רשמי", "עבודה", "לכבוד|הנדון|תוכן המכתב|בברכה", "serif"],
  ["יומן כתיבה", "כתיבה ועריכה", "המחשבה של היום|רעיונות|הצעד הבא", "serif"],
];
const actions = {
  templates() {
    const box = document.createElement("div");
    box.append(textElement("p", "התחילי ממבנה מוכן. כל תבנית נפתחת כמסמך חדש."));
    const grid = document.createElement("div"); grid.className = "template-grid";
    for (const [name, category, headings, font] of templates) {
      const button = document.createElement("button"); button.className = "template-card";
      button.append(textElement("small", category), textElement("strong", name), textElement("span", headings.replaceAll("|", " · ")));
      button.onclick = () => {
        const doc = newDocument(name, `<h1>${name}</h1>` + headings.split("|").map(h => `<h2>${h}</h2><p><br></p>`).join(""));
        doc.settings.font = font;
        closeModal(); addDocument(doc);
      };
      grid.append(button);
    }
    box.append(grid); modal("גלריית תבניות", box);
  },
  backup() {
    capture();
    const documents = collection.map(item => ({...item, doc: structuredClone(item.id === current ? draft : item.doc)}));
    download(".toklibrary", JSON.stringify({format:"toklibrary", version:1, documents}), "application/json");
    toast("הגיבוי כולל מסמכים, הערות ונקודות שחזור");
  },
  restoreLibrary() { $("library-file").click(); },
  readingStats() {
    const box = document.createElement("div"), value = stats(editor.innerText);
    for (const line of [
      `${value.words} מילים`, `${value.characters} תווים`,
      `${editor.querySelectorAll("p").length} פסקאות`,
      `${editor.querySelectorAll("h1,h2,h3").length} כותרות`,
      `${editor.querySelectorAll("table").length} טבלאות`,
      `זמן קריאה משוער: ${Math.max(1, Math.ceil(value.words / 200))} דקות (לפי 200 מילים בדקה)`,
    ]) box.append(textElement("p", line));
    modal("נתוני המסמך", box);
  },
  new: () => addDocument(newDocument()),
  open: () => $("file").click(),
  save() {
    capture();
    download(
      ".tokdoc",
      JSON.stringify(studioDocument(draft), null, 2),
      "application/json",
    );
    savedToFile = true;
    persist();
    toast("קובץ המסמך הוכן להורדה");
  },
  duplicate() {
    capture();
    addDocument(
      studioDocument({
        ...draft,
        title: (draft.title + " — עותק").slice(0, 120),
      }),
    );
  },
  deleteDocument() {
    if (
      !confirm(
        "למחוק את הטיוטה המקומית ונקודות השחזור שלה? קבצים שהורדת לא יימחקו.",
      )
    )
      return;
    clearTimeout(saveTimer);
    collection = collection.filter((d) => d.id !== current);
    if (!collection.length) {
      current = newId();
      draft = newDocument();
      collection.push({
        id: current,
        doc: draft,
        updated: Date.now(),
        snapshots: [],
      });
    } else {
      current = collection[0].id;
      draft = studioDocument(collection[0].doc);
    }
    sync();
    persist();
  },
  undo() {
    clearTimeout(typingTimer);
    checkpoint();
    const state = JSON.parse(history.undo());
    draft.settings = state.settings;
    editor.innerHTML = state.html;
    applyStyle();
    changed();
    updateUndo();
  },
  redo() {
    clearTimeout(typingTimer);
    const state = JSON.parse(history.redo());
    draft.settings = state.settings;
    editor.innerHTML = state.html;
    applyStyle();
    changed();
    updateUndo();
  },
  clear() {
    transact("removeFormat");
  },
  highlight() {
    transact("hiliteColor", "#fff1b0");
  },
  snapshot() {
    capture();
    const item = collection.find((d) => d.id === current);
    item.snapshots.unshift({ time: Date.now(), doc: structuredClone(draft) });
    item.snapshots = item.snapshots.slice(0, 5);
    persist();
    renderSnapshots();
    toast(dirty ? "השמירה המקומית נכשלה — שמרי קובץ" : "נקודת השחזור נשמרה");
  },
  search() {
    $("search-panel").hidden = !$("search-panel").hidden;
    if (!$("search-panel").hidden) $("query").focus();
  },
  find: findNext,
  replace() {
    restore();
    if (
      $("query").value &&
      window.getSelection().toString() === $("query").value
    )
      transact("insertText", $("replacement").value);
    findNext();
  },
  replaceAll,
  table() {
    const box = document.createElement("div");
    for (const [id, label, max, value] of [
      ["rows", "שורות", 30, 3],
      ["cols", "עמודות", 10, 3],
    ]) {
      const l = textElement("label", label),
        input = document.createElement("input");
      input.id = id;
      input.type = "number";
      input.min = 1;
      input.max = max;
      input.value = value;
      l.append(input);
      box.append(l);
    }
    const button = textElement("button", "הוספת טבלה");
    button.className = "save-button";
    button.onclick = () => {
      const rows = Number($("rows").value),
        cols = Number($("cols").value);
      if (
        !Number.isInteger(rows) ||
        !Number.isInteger(cols) ||
        rows < 1 ||
        rows > 30 ||
        cols < 1 ||
        cols > 10
      )
        return toast("טבלה: 1–30 שורות, 1–10 עמודות");
      const table = document.createElement("table");
      for (let r = 0; r < rows; r++) {
        const row = table.insertRow();
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement(r === 0 ? "th" : "td");
          cell.append(document.createElement("br"));
          row.append(cell);
        }
      }
      closeModal();
      insert(table.outerHTML + "<p><br></p>");
    };
    box.append(button);
    modal("טבלה חדשה", box);
  },
  row: () => tableEdit("row"),
  column: () => tableEdit("column"),
  deleteRow: () => tableEdit("deleteRow"),
  deleteTable: () => tableEdit("deleteTable"),
  pagebreak: () => insert('<hr class="page-break"><p><br></p>'),
  rule: () => insert("<hr><p><br></p>"),
  date: () => transact("insertText", new Date().toLocaleDateString("he-IL")),
  symbols() {
    const box = document.createElement("div");
    box.className = "symbol-grid";
    for (const ch of [
      "־",
      "״",
      "׳",
      "–",
      "—",
      "…",
      "•",
      "©",
      "®",
      "™",
      "§",
      "†",
      "₪",
      "€",
      "£",
      "½",
      "¼",
      "¾",
      "←",
      "→",
      "↑",
      "↓",
      "✓",
      "∞",
    ]) {
      const button = textElement("button", ch);
      button.onclick = () => {
        closeModal();
        transact("insertText", ch);
      };
      box.append(button);
    }
    modal("תווים מיוחדים", box);
  },
  focus() {
    document.body.classList.toggle("focus");
    setTimeout(actions.fit, 0);
  },
  theme() {
    document.body.classList.toggle("dark");
    try {
      localStorage.setItem(
        "typesetok.studio.theme",
        document.body.classList.contains("dark") ? "dark" : "light",
      );
    } catch {}
  },
  zoomIn() {
    zoom = Math.min(1.5, zoom + 0.1);
    applyStyle();
  },
  zoomOut() {
    zoom = Math.max(0.35, zoom - 0.1);
    applyStyle();
  },
  zoomReset() {
    zoom = 0.9;
    applyStyle();
  },
  fit() {
    zoom = Math.min(
      1,
      Math.max(
        0.35,
        ($("document-scroll").clientWidth - 70) /
          ((dimensions()[0] * 96) / 25.4),
      ),
    );
    applyStyle();
  },
  txt() {
    capture();
    download(".txt", plainText(draft.html), "text/plain;charset=utf-8");
  },
  html() {
    download(".html", exportHTML(), "text/html;charset=utf-8");
  },
  print() {
    applyStyle();
    window.print();
  },
  closeModal,
  proof() {
    const box = document.createElement("div"),
      issues = [],
      text = editor.innerText;
    if (!text.trim()) issues.push("המסמך ריק.");
    if (!editor.querySelector("h1")) issues.push("לא הוגדרה כותרת ראשית.");
    if (/ {2,}/.test(text))
      issues.push("נמצאו רווחים כפולים. אפשר לנקות דרך כלי הסקירה.");
    if (
      [...editor.querySelectorAll("p")].some((p) => p.textContent.length > 1000)
    )
      issues.push("יש פסקאות ארוכות מ־1,000 תווים. כדאי לבדוק את הקריאות.");
    if (!issues.length) issues.push("לא נמצאו בעיות בבדיקות המבנה הבסיסיות.");
    for (const issue of issues) box.append(textElement("p", issue));
    box.append(
      textElement(
        "p",
        "זו בדיקת מבנה בסיסית. היא אינה בדיקת לשון או אישור מוכנות לדפוס.",
      ),
    );
    modal("בדיקת מסמך", box);
  },
  help() {
    const box = document.createElement("div");
    for (const text of [
      "Ctrl / ⌘ + S — שמירת קובץ מסמך",
      "Ctrl / ⌘ + O — פתיחת מסמך",
      "Ctrl / ⌘ + K — חיפוש פעולה",
      "Ctrl / ⌘ + F — חיפוש והחלפה",
      "Ctrl / ⌘ + Z — ביטול; Shift + Z — שחזור",
      "Ctrl / ⌘ + B / I / U — מודגש, נטוי וקו תחתון",
      "Esc — יציאה ממצב ריכוז",
      "אפשר לפתוח גם טיוטות .tokdraft מהגרסה הקודמת. קובצי .tok של ליבת Rust עדיין אינם נתמכים.",
      "העיצוב בחלונית הפריסה משפיע על כל המסמך. עיצוב דרך כלי הטקסט חל על הבחירה.",
      "המקומות בדף מתרחבים בהתאם לתוכן. חלוקת דפי ההדפסה נעשית בחלון ההדפסה.",
    ])
      box.append(textElement("p", text));
    modal("עבודה עם Studio", box);
  },
  palette() {
    const box = document.createElement("div"),
      input = document.createElement("input"),
      list = document.createElement("div");
    input.placeholder = "מה תרצי לעשות?";
    input.setAttribute("aria-label", "חיפוש פעולה");
    list.className = "command-list";
    const commands = {
      ...Object.fromEntries(Object.entries(studioTools).map(([id, [label]]) => [id, label])),
      tools: "מרכז כלים",
      new: "מסמך חדש",
      templates: "גלריית תבניות",
      backup: "גיבוי ספריית המסמכים",
      restoreLibrary: "שחזור ספרייה מגיבוי",
      readingStats: "נתוני המסמך וזמן קריאה",
      open: "פתיחת קובץ",
      save: "שמירת מסמך",
      duplicate: "שכפול מסמך",
      snapshot: "נקודת שחזור",
      table: "הוספת טבלה",
      pagebreak: "מעבר מקטע",
      search: "חיפוש והחלפה",
      proof: "בדיקת מסמך",
      html: "ייצוא HTML",
      txt: "ייצוא טקסט",
      print: "הדפסה / PDF",
      theme: "החלפת מראה",
      focus: "מצב ריכוז",
      symbols: "תווים מיוחדים",
    };
    const draw = () => {
      list.replaceChildren();
      for (const [id, label] of Object.entries(commands))
        if (label.includes(input.value)) {
          const b = textElement("button", label);
          b.onclick = () => {
            closeModal();
            runAction(id);
          };
          list.append(b);
        }
    };
    input.oninput = draw;
    box.append(input, list);
    draw();
    modal("פעולות מהירות", box);
    input.focus();
  },
};
for (const action of ["spaces", "normalize", "niqqud", "marks", "trimLines", "removeInvisible", "upperCase", "lowerCase"])
  actions[action] = () => {
    restore();
    const selected = window.getSelection().toString();
    if (selected) {
      transact("insertText", transform(selected, action));
      return;
    }
    checkpoint();
    const before = editor.innerHTML;
    for (const node of textNodes()) node.textContent = transform(node.textContent, action);
    if (editor.innerHTML.length > 500000) {
      editor.innerHTML = before; savedRange = null;
      return toast("התוצאה גדולה מדי");
    }
    checkpoint();
    changed();
  };
function activeParagraph() {
  restore();
  const node = window.getSelection()?.anchorNode;
  const el = node?.nodeType === 1 ? node : node?.parentElement;
  const block = el?.closest("p,h1,h2,h3,blockquote,li,td,th");
  return block && editor.contains(block) ? block : null;
}
function editParagraph(action) {
  const block = activeParagraph();
  if (!block) return toast("מקמי את הסמן בפסקה");
  checkpoint();
  if (action === "paragraphRTL" || action === "paragraphLTR") {
    block.dir = action === "paragraphRTL" ? "rtl" : "ltr";
    block.style.textAlign = block.dir === "rtl" ? "right" : "left";
  } else {
    if (block.parentElement !== editor) return toast("הפעולה זמינה לפסקה ברמה הראשית בלבד");
    if (action === "duplicateParagraph") {
      if (editor.innerHTML.length + block.outerHTML.length > 500000) return toast("המסמך גדול מדי");
      block.after(block.cloneNode(true));
    }
    if (action === "moveParagraphUp" && block.previousElementSibling) block.previousElementSibling.before(block);
    if (action === "moveParagraphDown" && block.nextElementSibling) block.nextElementSibling.after(block);
  }
  const range = document.createRange(); range.selectNodeContents(block); range.collapse(true); setRange(range);
  checkpoint(); changed();
}
for (const action of ["paragraphRTL", "paragraphLTR", "duplicateParagraph", "moveParagraphUp", "moveParagraphDown"])
  actions[action] = () => editParagraph(action);
Object.assign(actions, {
  superscript: () => transact("superscript"), subscript: () => transact("subscript"),
  selectDocument() { const r = document.createRange(); r.selectNodeContents(editor); setRange(r); },
  deleteColumn: () => tableEdit("deleteColumn"), headerRow: () => tableEdit("headerRow"),
  tableCSV() {
    const cell = activeCell();
    if (!cell) return toast("מקמי את הסמן בתוך טבלה");
    const table = cell.closest("table");
    if ([...table.querySelectorAll("td,th")].some(c => c.colSpan > 1 || c.rowSpan > 1))
      return toast("ייצוא CSV זמין לטבלה ללא תאים ממוזגים");
    const rows = [...table.rows].map(r => [...r.cells].map(c => {
      let value = c.innerText;
      // Prevent spreadsheet formula interpretation, including leading controls/whitespace.
      if (/^[\s\u0000-\u001f]*[=+@-]/u.test(value)) value = "'" + value;
      return '"' + value.replaceAll('"', '""') + '"';
    }).join(",")).join("\r\n");
    capture(); download(".csv", "\ufeff" + rows, "text/csv;charset=utf-8");
  },
  toc() {
    const headings = [...editor.querySelectorAll("h1,h2,h3")].slice(0, 100);
    if (!headings.length) return toast("הוסיפי כותרות למסמך תחילה");
    const box = document.createElement("div"), label = textElement("p", "תוכן עניינים");
    const strong = textElement("strong", label.textContent); label.replaceChildren(strong); box.append(label);
    const list = document.createElement("ul");
    for (const h of headings) list.append(textElement("li", h.textContent));
    box.append(list); insert(box.innerHTML);
    toast("נוסף תוכן עניינים כטקסט; הוא אינו מתעדכן אוטומטית ואינו כולל מספרי עמודים");
  },
  outlineTXT() {
    capture();
    const text = [...editor.querySelectorAll("h1,h2,h3")].map(h => "#".repeat(Number(h.tagName.slice(1))) + " " + h.textContent).join("\n");
    download(".outline.txt", text, "text/plain;charset=utf-8");
  },
  hebrewDate: () => transact("insertText", new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {dateStyle:"long"}).format(new Date())),
  nbsp: () => transact("insertText", "\u00a0"),
  readingView() {
    const enabled = document.body.classList.toggle("reading-view");
    editor.contentEditable = String(!enabled);
    editor.setAttribute("aria-readonly", String(enabled));
    for (const id of ["title", "notes", "goal"]) $(id).readOnly = enabled;
    $("reading-banner").hidden = !enabled;
    toast(enabled ? "מצב קריאה — עריכת תוכן המסמך נעולה" : "חזרת למצב עריכה");
  },
  tools() {
    const box = document.createElement("div"), search = document.createElement("input"), grid = document.createElement("div");
    box.className = "tools-center"; grid.className = "tools-grid";
    search.type = "search"; search.placeholder = "חיפוש כלי לפי שם או תחום…"; search.setAttribute("aria-label", "חיפוש במרכז הכלים");
    const draw = () => {
      grid.replaceChildren();
      for (const category of [...new Set(Object.values(studioTools).map(v => v[1]))]) {
        const matches = Object.entries(studioTools).filter(([, [label, group]]) => group === category && (label + group).includes(search.value.trim()));
        if (!matches.length) continue;
        const section = document.createElement("section"); section.append(textElement("h3", category));
        for (const [id, [label]] of matches) {
          const b = textElement("button", label); b.dataset.tool = id;
          b.onclick = () => { closeModal(); runAction(id); };
          section.append(b);
        }
        grid.append(section);
      }
      if (!grid.childNodes.length) grid.append(textElement("p", "לא נמצאו כלים תואמים."));
    };
    search.oninput = draw; box.append(search, grid); draw(); modal("מרכז הכלים", box); search.focus();
  },
});
for (const mode of ["sepia", "contrast", "compact"]) actions[mode] = () => {
  document.body.classList.toggle(mode);
  try { localStorage.setItem("typesetok.studio.view." + mode, String(document.body.classList.contains(mode))); } catch {}
};
// Reading mode must block every mutation route, including the command palette and shortcuts.
const readingActions = new Set(["tools","palette","readingView","sepia","contrast","compact","theme","focus","fit","zoomIn","zoomOut","zoomReset","print","save","txt","html","backup","readingStats","proof","help","search","find","closeModal","outlineTXT","selectDocument"]);
function runAction(id) {
  if (document.body.classList.contains("reading-view") && !readingActions.has(id))
    return toast("חזרי למצב עריכה כדי לשנות את המסמך");
  actions[id]?.();
}
function activateTab(name) {
  for (const button of document.querySelectorAll("[data-tab]"))
    button.classList.toggle("active", button.dataset.tab === name);
  for (const group of document.querySelectorAll(".ribbon"))
    group.hidden = group.id !== "ribbon-" + name;
}
document.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button") && !event.target.closest("#editor")) {
    remember();
    if (event.target.closest("[data-command],[data-block]"))
      event.preventDefault();
  }
});
document.addEventListener("click", (event) => {
  const el = event.target.closest("button");
  if (!el) return;
  try {
    if (el.dataset.action) runAction(el.dataset.action);
    if (document.body.classList.contains("reading-view") && (el.dataset.command || el.dataset.block || el.dataset.preset))
      return toast("חזרי למצב עריכה כדי לשנות את המסמך");
    if (el.dataset.command) transact(el.dataset.command);
    if (el.dataset.block) transact("formatBlock", el.dataset.block);
    if (el.dataset.tab) activateTab(el.dataset.tab);
    if (el.dataset.panel) {
      for (const name of ["documents", "outline"])
        $(name + "-panel").hidden = name !== el.dataset.panel;
      document
        .querySelectorAll("[data-panel]")
        .forEach((b) => b.classList.toggle("active", b === el));
    }
    if (el.dataset.inspect) {
      for (const name of ["design", "notes", "history"])
        $("inspect-" + name).hidden = name !== el.dataset.inspect;
      document
        .querySelectorAll("[data-inspect]")
        .forEach((b) => b.classList.toggle("active", b === el));
    }
    if (el.dataset.preset) {
      checkpoint();
      Object.assign(
        draft.settings,
        {
          editorial: {
            font: "serif",
            size: 14,
            leading: 1.8,
            spacing: 12,
            align: "right",
            indent: false,
          },
          book: {
            font: "serif",
            size: 12,
            leading: 1.65,
            spacing: 9,
            align: "justify",
            indent: true,
          },
          modern: {
            font: "sans-serif",
            size: 13,
            leading: 1.85,
            spacing: 16,
            align: "right",
            indent: false,
          },
          poem: {
            font: "serif",
            size: 16,
            leading: 2,
            spacing: 20,
            align: "center",
            indent: false,
          },
        }[el.dataset.preset],
      );
      for (const [id, value] of Object.entries(draft.settings)) {
        if ($(id)) {
          if (typeof value === "boolean") $(id).checked = value;
          else $(id).value = value;
        }
      }
      applyStyle();
      checkpoint();
      changed();
      document
        .querySelectorAll("[data-preset]")
        .forEach((b) => b.classList.toggle("active", b === el));
    }
  } catch (error) {
    toast(error.message);
  }
});
document.addEventListener("selectionchange", () => {
  if (!selectionInEditor()) return;
  remember();
  const selection = window.getSelection();
  $("selection-stats").textContent = selection.toString()
    ? selection.toString().length + " תווים בבחירה"
    : "";
  let el = selection.anchorNode?.parentElement;
  $("active-style").textContent = el?.closest("h1,h2,h3")
    ? "כותרת"
    : el?.closest("td,th")
      ? "תא בטבלה"
      : "טקסט רגיל";
  for (const b of document.querySelectorAll("[data-command]"))
    try {
      b.setAttribute(
        "aria-pressed",
        String(document.queryCommandState(b.dataset.command)),
      );
    } catch {}
});
editor.addEventListener("beforeinput", () => {
  if (!composing && Date.now() - lastInput > 600) checkpoint();
});
editor.addEventListener("compositionstart", () => (composing = true));
editor.addEventListener("compositionend", () => {
  composing = false;
  checkpoint();
  changed();
});
editor.addEventListener("input", () => {
  if (composing) return;
  lastInput = Date.now();
  try {
    if (editor.innerHTML.length > 500000) throw Error("המסמך גדול מדי");
  } catch (error) {
    editor.innerHTML = JSON.parse(history.items[history.index]).html;
    toast(error.message);
    return;
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(checkpoint, 600);
  changed();
});
editor.addEventListener("paste", (event) => {
  event.preventDefault();
  if (document.body.classList.contains("reading-view")) return;
  try {
    const html = event.clipboardData?.getData("text/html"),
      text = event.clipboardData?.getData("text/plain") || "";
    remember();
    insert(html || textToHTML(text));
  } catch (error) {
    toast(error.message);
  }
});
editor.addEventListener("drop", (event) => event.preventDefault());
for (const [id, value] of Object.entries(defaults)) {
  if (!$(id)) continue;
  $(id).addEventListener("change", () => {
    if (document.body.classList.contains("reading-view")) { applyStyle(); return; }
    try {
      checkpoint();
      const next =
        typeof value === "boolean"
          ? $(id).checked
          : typeof value === "number"
            ? Number($(id).value)
            : $(id).value;
      draft = studioDocument({
        ...capture(),
        settings: { ...draft.settings, [id]: next },
      });
      applyStyle();
      checkpoint();
      changed();
    } catch (error) {
      toast(error.message);
      $(id).value = draft.settings[id];
    }
  });
}
$("ink").addEventListener("input", () => { if (!document.body.classList.contains("reading-view")) transact("foreColor", $("ink").value); });
$("spell").addEventListener(
  "change",
  () => (editor.spellcheck = $("spell").checked),
);
for (const id of ["title", "notes", "goal"])
  $(id).addEventListener("input", changed);
$("query").addEventListener("input", refresh);
$("library-query").addEventListener("input", renderDocuments);
$("library-sort").addEventListener("change", renderDocuments);
$("library-file").addEventListener("change", async () => {
  const file = $("library-file").files[0];
  if (!file) return;
  try {
    if (file.size > 14000000) throw Error("קובץ הגיבוי גדול מדי");
    const value = JSON.parse(await file.text());
    if (value?.format !== "toklibrary" || value.version !== 1 || !Array.isArray(value.documents) || !value.documents.length || value.documents.length > 10)
      throw Error("זה אינו גיבוי ספרייה תקין");
    const imported = value.documents.map(item => ({
      id: newId(), doc: studioDocument(item.doc), updated: Date.now(),
      snapshots: (Array.isArray(item.snapshots) ? item.snapshots : []).slice(0, 5).map(point => ({
        time: Number.isFinite(point.time) ? point.time : Date.now(), doc: studioDocument(point.doc)
      }))
    }));
    persist();
    if (dirty) throw Error("יש שינויים שלא נשמרו. שמרי קובץ לפני שחזור ספרייה.");
    if (collection.length + imported.length > 10) throw Error("השחזור מוסיף מסמכים. אין מספיק מקום: עד 10 מסמכים בספרייה.");
    const next = [...collection, ...imported];
    const serialized = JSON.stringify({current, documents:next});
    if (serialized.length > 3500000) throw Error("אין מספיק מקום מקומי לשחזור הגיבוי");
    if (!confirm(`להוסיף ${imported.length} מסמכים מהגיבוי? המסמכים הקיימים יישמרו.`)) return;
    localStorage.setItem(storageKey, serialized);
    collection = next;
    renderDocuments();
    toast("המסמכים נוספו מהגיבוי בהצלחה");
  } catch (error) { toast(error.message || "שחזור הגיבוי נכשל"); }
  finally { $("library-file").value = ""; }
});
$("file").addEventListener("change", async () => {
  const file = $("file").files[0];
  if (!file) return;
  try {
    if (file.size > 2000000) throw Error("הקובץ גדול מדי — עד 2MB");
    const raw = await file.text();
    const doc = file.name.toLowerCase().endsWith(".txt")
      ? newDocument(file.name.slice(0, -4).slice(0, 120), textToHTML(raw))
      : studioDocument(JSON.parse(raw));
    addDocument(doc);
  } catch (error) {
    toast(error.message || "פתיחת הקובץ נכשלה");
  } finally {
    $("file").value = "";
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.body.classList.remove("focus");
    return;
  }
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase(),
    action = {
      s: "save",
      o: "open",
      k: "palette",
      f: "search",
      z: event.shiftKey ? "redo" : "undo",
      y: "redo",
    }[key];
  if (action) {
    if (
      ["undo", "redo"].includes(action) &&
      !editor.contains(event.target) &&
      event.target !== editor
    )
      return;
    event.preventDefault();
    clearTimeout(typingTimer);
    runAction(action);
  }
});
window.addEventListener("beforeunload", (event) => {
  persist();
  if (dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) persist();
});
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  if (saved?.documents?.length) {
    collection = saved.documents
      .slice(0, 10)
      .map((item) => ({
        id: String(item.id),
        doc: studioDocument(item.doc),
        updated: Number(item.updated) || Date.now(),
        snapshots: (Array.isArray(item.snapshots) ? item.snapshots : [])
          .slice(0, 5)
          .map((point) => ({
            time: Number(point.time) || Date.now(),
            doc: studioDocument(point.doc),
          })),
      }));
    current = collection.some((d) => d.id === saved.current)
      ? saved.current
      : collection[0].id;
    draft = studioDocument(collection.find((d) => d.id === current).doc);
  } else {
    const legacy = localStorage.getItem("typesetok.draft.v1");
    draft = legacy
      ? studioDocument(JSON.parse(legacy))
      : newDocument("מחברת רעיונות", welcome);
  }
  document.body.classList.toggle(
    "dark",
    localStorage.getItem("typesetok.studio.theme") === "dark",
  );
} catch {
  storageLocked = true;
  draft = newDocument("מחברת רעיונות", welcome);
  setTimeout(
    () =>
      toast(
        "לא ניתן לטעון את הספרייה המקומית. הנתונים הישנים לא נמחקו; אפשר לפתוח קובץ גיבוי.",
      ),
    100,
  );
}
if (!collection.length) {
  current = newId();
  collection.push({
    id: current,
    doc: draft,
    updated: Date.now(),
    snapshots: [],
  });
}
sync();
for (const mode of ["sepia", "contrast", "compact"]) {
  try { document.body.classList.toggle(mode, localStorage.getItem("typesetok.studio.view." + mode) === "true"); } catch {}
}
for (const b of document.querySelectorAll("button[title]")) if (!b.hasAttribute("aria-label")) b.setAttribute("aria-label", b.title);
setTimeout(actions.fit, 30);
