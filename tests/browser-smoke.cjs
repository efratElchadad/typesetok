const { chromium } = require(process.env.TOK_PLAYWRIGHT || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.TOK_CHROMIUM || undefined,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1050 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.goto(
      "file://" + path.resolve("packages/tok-ui/dist/TypesetOK.html"),
    );
    await page.locator("#editor h1").waitFor();
    await page.waitForTimeout(150);
    await page.screenshot({
      path: process.env.TOK_SCREENSHOT || "/tmp/typesetok-studio.png",
      fullPage: true,
    });
    const selectText = async (text) =>
      page.locator("#editor").evaluate((el, text) => {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
          const i = n.textContent.indexOf(text);
          if (i >= 0) {
            const r = document.createRange();
            r.setStart(n, i);
            r.setEnd(n, i + text.length);
            el.focus();
            const s = getSelection();
            s.removeAllRanges();
            s.addRange(r);
            return;
          }
        }
        throw Error("Missing selection text");
      }, text);
    await selectText("כתיבה טובה");
    await page.click('[data-command="bold"]');
    assert.ok(
      await page
        .locator("#editor")
        .evaluate((e) =>
          [...e.querySelectorAll("b,strong,span")].some(
            (n) =>
              n.textContent.includes("כתיבה טובה") &&
              (n.tagName === "B" ||
                n.tagName === "STRONG" ||
                n.style.fontWeight === "bold"),
          ),
        ),
    );
    await page.click('[data-action="undo"]');
    assert.equal(await page.locator("#editor b,#editor strong").count(), 0);
    await page.click('[data-action="redo"]');
    assert.ok((await page.locator("#editor b,#editor strong").count()) > 0);
    await page.click('[data-tab="insert"]');
    await page.click('[data-action="table"]');
    await page.fill("#rows", "2");
    await page.fill("#cols", "3");
    await page.getByRole("button", { name: "הוספת טבלה", exact: true }).click();
    assert.equal(await page.locator("#editor table tr").count(), 2);
    await page.locator("#editor td").first().click();
    await page.click('[data-action="row"]');
    assert.equal(await page.locator("#editor table tr").count(), 3);
    await page.locator("#editor td").first().click();
    await page.click('[data-action="column"]');
    assert.equal(
      await page.locator("#editor table tr").first().locator("th,td").count(),
      4,
    );
    await page.click('[data-tab="home"]');
    await page.click('[data-action="snapshot"]');
    await page.click('[data-inspect="notes"]');
    await page.fill("#notes", "הערה פנימית שלא תופיע בייצוא");
    const downloadEvent = page.waitForEvent("download");
    await page.click('[data-action="save"]');
    const file = await downloadEvent;
    const contents = JSON.parse(fs.readFileSync(await file.path(), "utf8"));
    assert.equal(contents.format, "tokdoc");
    assert.ok(contents.html.includes("<table>"));
    assert.ok(contents.notes.includes("הערה פנימית"));
    await page.setInputFiles("#file", {
      name: "saved.tokdoc",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(contents)),
    });
    await page.waitForTimeout(250);
    assert.equal(await page.locator("#editor table tr").count(), 3);
    const unsafe = {
      format: "tokdoc",
      version: 1,
      title: "בטיחות",
      html: '<h1>בדיקה</h1><p onclick="window.pwned=1">שלום שלום</p><script>window.pwned=1</script><img src="x" onerror="window.pwned=1"><iframe src="https://example.com"></iframe><span style="font-size:999999pt">קטן</span>',
      settings: {},
    };
    await page.setInputFiles("#file", {
      name: "unsafe.tokdoc",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(unsafe)),
    });
    await page.waitForTimeout(250);
    assert.equal(
      await page
        .locator("#editor script,#editor img,#editor iframe,#editor [onclick]")
        .count(),
      0,
    );
    assert.equal(await page.evaluate(() => window.pwned), undefined);
    assert.ok(!(await page.locator("#editor").innerHTML()).includes("999999"));
    await page.click('[data-action="search"]');
    await page.fill("#query", "שלום");
    await page.fill("#replacement", "ברכה");
    await page.click('[data-action="replaceAll"]');
    assert.ok(
      (await page.locator("#editor").innerText()).includes("ברכה ברכה"),
    );
    await page.click('[data-action="undo"]');
    assert.ok(
      (await page.locator("#editor").innerText()).includes("שלום שלום"),
    );
    await page.click('[data-action="redo"]');
    assert.ok(
      (await page.locator("#editor").innerText()).includes("ברכה ברכה"),
    );
    await page.click('[data-tab="layout"]');
    await page.selectOption("#paper", "A5");
    assert.equal(
      await page.locator(".paper").evaluate((e) => e.style.width),
      "148mm",
    );
    await page.click('[data-tab="home"]');
    await page.click('[data-action="snapshot"]');
    await page.locator("#editor").fill("שינוי אחרי נקודת שחזור");
    await page.waitForTimeout(850);
    await page.click('[data-inspect="history"]');
    await page.locator("#snapshots button").first().click();
    assert.ok(
      (await page.locator("#editor").innerText()).includes("ברכה ברכה"),
    );
    await page.click('[data-inspect="design"]');
    const exporting = page.waitForEvent("download");
    await page.click('[data-action="html"]');
    const output = await exporting;
    const html = fs.readFileSync(await output.path(), "utf8");
    assert.ok(html.includes("ברכה ברכה"));
    assert.ok(!html.includes("window.pwned"));
    await page.click('[data-action="theme"]');
    assert.ok(
      await page.locator("body").evaluate((e) => e.classList.contains("dark")),
    );
    await page.click('.top-actions [data-action="focus"]');
    assert.ok(
      await page.locator("body").evaluate((e) => e.classList.contains("focus")),
    );
    await page.keyboard.press("Escape");
    await page.click('[data-action="palette"]');
    await page.getByRole("textbox", { name: "חיפוש פעולה" }).fill("שכפול");
    await page.getByRole("button", { name: "שכפול מסמך", exact: true }).click();
    assert.ok((await page.locator("#title").inputValue()).includes("עותק"));
    await page.waitForTimeout(800);
    await page.reload();
    assert.ok((await page.locator("#title").inputValue()).includes("עותק"));
    assert.ok(
      (await page.locator("#editor").innerText()).includes("ברכה ברכה"),
    );
    const legacy = {
      format: "tokdraft",
      version: 1,
      title: "טיוטה ותיקה",
      text: "# כותרת ישנה\n\nטקסט מהגרסה הקודמת",
      settings: {},
    };
    await page.setInputFiles("#file", {
      name: "legacy.tokdraft",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacy)),
    });
    await page.waitForTimeout(250);
    assert.equal(await page.locator("#editor h1").innerText(), "כותרת ישנה");
    const context = await browser.newContext({
        viewport: { width: 1100, height: 800 },
      }),
      small = await context.newPage();
    await small.goto(
      "file://" + path.resolve("packages/tok-ui/dist/TypesetOK.html"),
    );
    await small.locator("#editor h1").waitFor();
    await small.waitForTimeout(100);
    assert.ok(await small.locator("#editor").isVisible());
    await context.close();
    assert.deepEqual(errors, []);
    console.log(
      "Studio browser checks passed: rich formatting, undo/redo, tables, snapshots, notes, file round trip, sanitization, search/replace, page settings, export, theme/focus, command palette, duplicate, recovery, legacy import and compact viewport.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(String(error).slice(0, 2000));
  process.exit(1);
});
