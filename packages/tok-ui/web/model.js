export const MAX_TEXT = 500_000;
export const defaults = {
  font: "serif",
  size: 14,
  leading: 1.8,
  align: "justify",
  direction: "rtl",
  spacing: 12,
  indent: false,
  paper: "A4",
  orientation: "portrait",
  margin: 22,
  numbers: true,
  guides: false,
};
export const sample =
  "# מקום למילים שלך\n\nכל ספר מתחיל ברעיון אחד. משפט שמבקש להיכתב, סיפור שמחכה למצוא את מקומו על הדף.\n\nTypesetOK מעניקה לטקסט שלך מרחב נקי: כתיבה רציפה בצד אחד, ותצוגת המסמך בצד השני. בחרי גופן, התאימי את השוליים ותני למילים לנשום.\n\n## מתחילים בפשטות\n\nאפשר לשנות את הטקסט הזה, לפתוח קובץ משלך, או להתחיל מסמך חדש. השינויים נשמרים כטיוטה מקומית בדפדפן. לשמירת עותק משלך, לחצי על שמירת קובץ.\n\n## הקצב של העמוד\n\nכותרות נכתבות עם # בתחילת שורה. הוסיפי --- בשורה נפרדת כדי להתחיל עמוד חדש. כלי העיצוב משפיעים על כל המסמך ושומרים על מראה עקבי.\n\nזה המקום לכתוב את הדבר הבא.";
export function validateDraft(value) {
  if (
    !value ||
    value.format !== "tokdraft" ||
    value.version !== 1 ||
    typeof value.text !== "string" ||
    value.text.length > MAX_TEXT ||
    typeof value.title !== "string" ||
    value.title.length > 120
  )
    throw Error("קובץ טיוטה לא תקין או גדול מדי");
  const settings = { ...defaults };
  const enums = {
    font: ["serif", "sans-serif", "monospace"],
    align: ["justify", "right", "left", "center"],
    direction: ["rtl", "ltr"],
    paper: ["A4", "A5", "Letter"],
    orientation: ["portrait", "landscape"],
  };
  const bounds = {
    size: [9, 36],
    leading: [1, 3],
    spacing: [0, 32],
    margin: [10, 35],
  };
  if (!value.settings || typeof value.settings !== "object")
    throw Error("חסרות הגדרות עיצוב");
  for (const key of Object.keys(defaults)) {
    const v = value.settings[key];
    if (v === undefined) continue;
    if (
      enums[key]
        ? !enums[key].includes(v)
        : bounds[key]
          ? typeof v !== "number" ||
            !Number.isFinite(v) ||
            v < bounds[key][0] ||
            v > bounds[key][1]
          : typeof v !== "boolean"
    )
      throw Error("הגדרת עיצוב לא תקינה");
    settings[key] = v;
  }
  return {
    format: "tokdraft",
    version: 1,
    title: value.title,
    text: value.text,
    settings,
  };
}
export function stats(text) {
  return {
    words: text.trim() ? text.trim().split(/\s+/u).length : 0,
    characters: [...text].length,
    paragraphs: text.split(/\n\s*\n/u).filter((s) => s.trim()).length,
  };
}
export function countMatches(text, query) {
  if (!query) return 0;
  let count = 0,
    pos = 0;
  while ((pos = text.indexOf(query, pos)) !== -1) {
    count++;
    pos += query.length;
  }
  return count;
}
export function transform(text, action) {
  if (action === "normalize") return text.normalize("NFC");
  if (action === "spaces")
    return text
      .replace(/[ \t]+/g, " ")
      .replace(/^ +| +$/gm, "")
      .replace(/\n{3,}/g, "\n\n");
  if (action === "niqqud")
    return text.replace(
      /[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g,
      "",
    );
  if (action === "marks") return text.replace(/[\u0591-\u05AF]/g, "");
  return text;
}
export class History {
  constructor(initial) {
    this.items = [initial];
    this.index = 0;
    this.bytes = initial.length;
  }
  push(value) {
    if (value === this.items[this.index]) return;
    this.items = this.items.slice(0, this.index + 1);
    this.items.push(value);
    this.bytes = this.items.reduce((n, s) => n + s.length, 0);
    while (
      this.items.length > 2 &&
      (this.items.length > 60 || this.bytes > 4_000_000)
    )
      this.bytes -= this.items.shift().length;
    this.index = this.items.length - 1;
  }
  undo() {
    if (this.index > 0) this.index--;
    return this.items[this.index];
  }
  redo() {
    if (this.index < this.items.length - 1) this.index++;
    return this.items[this.index];
  }
}

// Studio documents retain safe rich text. Untrusted markup never enters the live editor.
export function cleanHTML(html) {
  if (typeof html !== "string" || html.length > 500000)
    throw Error("המסמך גדול מדי: עד 500KB של תוכן ועיצוב");
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set(
    "P DIV H1 H2 H3 BLOCKQUOTE UL OL LI TABLE THEAD TBODY TFOOT TR TH TD STRONG EM B I U S STRIKE SPAN FONT MARK BR HR SUB SUP".split(
      " ",
    ),
  );
  const dangerous = new Set(
    "SCRIPT STYLE IFRAME OBJECT EMBED SVG MATH LINK META FORM INPUT BUTTON TEXTAREA SELECT IMG VIDEO AUDIO".split(
      " ",
    ),
  );
  let nodes = 0;
  function copy(node) {
    if (++nodes > 8000) throw Error("יש יותר מדי רכיבים במסמך");
    if (node.nodeType === 3)
      return document.createTextNode(node.textContent || "");
    if (node.nodeType !== 1 || dangerous.has(node.tagName))
      return document.createTextNode("");
    const el = document.createElement(
      allowed.has(node.tagName) ? node.tagName.toLowerCase() : "span",
    );
    for (const property of [
      "color",
      "background-color",
      "font-weight",
      "font-style",
      "text-decoration",
      "text-align",
      "font-size",
      "font-family",
    ]) {
      const value = node.style.getPropertyValue(property);
      if (
        property === "font-size" &&
        (!/^\d+(\.\d+)?(px|pt)$/.test(value) ||
          parseFloat(value) < 8 ||
          parseFloat(value) > 72)
      )
        continue;
      if (
        value &&
        value.length <= 100 &&
        !/url|expression|var\(|[<>]/i.test(value)
      )
        el.style.setProperty(property, value);
    }
    if (node.tagName === "FONT") {
      const color = node.getAttribute("color");
      if (color && /^#[0-9a-f]{3,8}$|^[a-z]{1,20}$/i.test(color))
        el.style.color = color;
      const size = Number(node.getAttribute("size"));
      if (size >= 1 && size <= 7)
        el.style.fontSize = [0, 10, 12, 14, 18, 24, 32, 40][size] + "pt";
    }
    if (/^(rtl|ltr)$/.test(node.getAttribute("dir") || ""))
      el.dir = node.getAttribute("dir");
    if (["TD", "TH"].includes(node.tagName))
      for (const attr of ["colspan", "rowspan"]) {
        const value = Number(node.getAttribute(attr));
        if (Number.isInteger(value) && value > 1 && value <= 20)
          el.setAttribute(attr, String(value));
      }
    if (node.tagName === "HR" && node.classList.contains("page-break")) {
      el.className = "page-break";
      el.contentEditable = "false";
    }
    for (const child of node.childNodes) el.append(copy(child));
    return el;
  }
  const container = document.createElement("div");
  for (const node of parsed.body.childNodes) container.append(copy(node));
  return container.innerHTML;
}
export function textToHTML(text) {
  if (typeof text !== "string" || text.length > MAX_TEXT)
    throw Error("הטקסט גדול מדי");
  const box = document.createElement("div");
  for (const block of text.split(/\n\s*\n/u)) {
    if (block.trim() === "---") {
      const hr = document.createElement("hr");
      hr.className = "page-break";
      box.append(hr);
      continue;
    }
    const match = block.match(/^(#{1,3}) (.*)/s);
    const el = document.createElement(match ? "h" + match[1].length : "p");
    (match ? match[2] : block).split("\n").forEach((line, i) => {
      if (i) el.append(document.createElement("br"));
      el.append(document.createTextNode(line));
    });
    box.append(el);
  }
  return cleanHTML(box.innerHTML);
}
export function plainText(html) {
  const box = document.createElement("div");
  box.innerHTML = cleanHTML(html);
  box
    .querySelectorAll("br,hr")
    .forEach((el) => el.replaceWith(document.createTextNode("\n")));
  box
    .querySelectorAll("p,div,h1,h2,h3,li,tr,blockquote")
    .forEach((el) => el.append(document.createTextNode("\n")));
  return (box.textContent || "").trim();
}
export function studioDocument(value) {
  if (value?.format === "tokdraft") {
    const old = validateDraft(value);
    return studioDocument({
      format: "tokdoc",
      version: 1,
      title: old.title,
      html: textToHTML(old.text),
      settings: old.settings,
    });
  }
  if (
    !value ||
    value.format !== "tokdoc" ||
    value.version !== 1 ||
    typeof value.title !== "string" ||
    value.title.length > 120
  )
    throw Error("זה אינו מסמך Studio תקין");
  const settings = validateDraft({
    format: "tokdraft",
    version: 1,
    title: value.title,
    text: "",
    settings: value.settings || {},
  }).settings;
  const notes = value.notes ?? "";
  const goal = value.goal ?? 1000;
  if (
    typeof notes !== "string" ||
    notes.length > 10000 ||
    !Number.isInteger(goal) ||
    goal < 0 ||
    goal > 100000
  )
    throw Error("פרטי המסמך אינם תקינים");
  return {
    format: "tokdoc",
    version: 1,
    title: value.title,
    html: cleanHTML(value.html),
    settings,
    notes,
    goal,
  };
}
