# TypesetOK (TOK)

מערכת עימוד עברית שולחנית בפיתוח, עם ליבה ב־Rust ומעטפת TypeScript/Electron.
היעד הוא עימוד ספרים וטקסטים רב־תזרימיים. **זהו אב־טיפוס, לא מוצר מוכן לדפוס מקצועי.**

## סביבת העריכה הקלה — חדשה

נוסף עורך מקומי עם עיצוב RTL, ערכות צבעים, חיפוש והחלפה, תבניות, שמירת טיוטות וייצוא. **מעל 40 אפשרויות מפורטות ב[מדריך הגרסה](docs/LIGHT_EDITOR_HE.md).**

```sh
# בניית קובץ HTML עצמאי — אין צורך ב-npm install
npm run build
# פתיחת packages/tok-ui/dist/TypesetOK.html בדפדפן
npm test

# מעטפת שולחנית אופציונלית (נדרשת התקנת תלויות)
npm ci
npm run build:desktop
npm start
```

העורך שומר `.tokdraft` ופותח טקסט; הוא אינו מחובר עדיין למודל `.tok` ולמנוע העימוד ב־Rust. ייצוא PDF משתמש בחלון ההדפסה של הדפדפן ואינו PDF/X. גודל HTML העצמאי הוא כ־34KB; מעטפת Electron נפרדת וכבדה יותר.

## מה קיים בקוד

| רכיב | מימוש נוכחי | מגבלה עיקרית |
| --- | --- | --- |
| `tok-core` | מודל מסמך, סגנונות, פעולות עריכה, נרמול עברית | נדרש אימות על מסמכים אמיתיים ומקרי קצה |
| `tok-typeset` | שבירת שורות, יישור, גימטריה, BiDi ופותר רב־תזרימי | מסלול העימוד הראשי משתמש ב־`shape_fallback`; עיצוב גליפים לפי גופן עדיין אינו משולב בו |
| `tok-storage` | חבילות ZIP מסוג `.tok`, נכסים, תצוגות מקדימות וסביבת עבודה ב־redb | שמירה אטומית ועמידות קריסה דורשות בדיקות נוספות, במיוחד ב־Windows |
| `tok-pdf` | יצירת PDF, תיבות דפוס, ToUnicode וייצוא HTML | PDF משתמש ב־Helvetica ללא הטמעת גופן עברי; אין לראות בו פלט PDF/X מאומת |
| `tok-ipc` | פקודות ואירועים ב־JSON עם כותרת אורך בת 4 בתים | אינו FlatBuffers או zero-copy; הסכמה קיימת כתכנון |
| `tok-cli` | ייצוא, בדיקת חבילה, מבחן עומס ובדיקת דטרמיניזם | מבחן פסקה יחידה אינו אימות לקסקדת עימוד מלאה או ל־120 FPS |
| `packages/*` | עורך מקומי פעיל ומעטפת Electron מבודדת; רכיבי העורך הוותיקים נשמרו | העורך החדש משתמש במודל טיוטה נפרד, ללא חיבור עריכה–ליבת Rust |

## הפעלה של הליבה

נדרשים Rust stable ו־Cargo. הבדיקות ב־CI מיועדות ל־Linux ול־Windows.

```sh
git clone https://github.com/efratElchadad/typesetok.git
cd typesetok
cargo build --workspace --locked
cargo test --workspace --locked
cargo run -p tok-cli -- render-html --demo output.html
cargo run -p tok-cli -- render-pdf --demo output.pdf
cargo run -p tok-cli -- benchmark-typeset --pages 1000
cargo run -p tok-cli -- verify-determinism
cargo run -p tok-cli -- inspect-package document.tok
```

`--pages` מקבל מספר שלם בטווח 1–10000. זהו יעד ליצירת corpus, לא התחייבות למספר עמודי הפלט.
ייצוא PDF הוא ניסיוני. אין לשלוח אותו לדפוס בהסתמך על תגיות PDF/X שהקוד כותב.
פקודת `npm run build` בונה את העורך המקומי העצמאי; `build:desktop` בונה גם את כניסת Electron החדשה.

## הקשחת קלט

- חבילות `.tok`: עד 256 MiB לקובץ ZIP, עד 4096 רשומות הנחשפות דרך ספריית ZIP, עד 64 MiB לרשומה, עד 1 MiB למניפסט ועד 256 MiB סך נתונים לא דחוסים לפי מטא־נתוני הארכיב. קריאות התוכן עצמן מוגבלות גם הן.
- שמות נכסים: דחיית נתיבים מוחלטים, `..`, מפרידי Windows, תווי NUL בקריאה; בדיקת שמות נכסים גם לפני שמירה.
- IPC: אימות אורך מדויק ומגבלת מטען של 8 MiB בשני הכיוונים. הודעות חסרות או מחוברות זו לזו נדחות; על שכבת התעבורה להעביר מסגרת אחת בכל פעם.
- HTML: escaping של טקסט ושל תוויות מספרי עמודים, כולל הקשר של מאפיין HTML.

אלה הגנות ממוקדות, לא אישור שהמערכת בטוחה לכל קלט. פירוט פערים וסדר טיפול: [דוח הסקירה](docs/REVIEW_HE.md).

## תיעוד ורישיון

- [דוח ארכיטקטורה](docs/architecture/TOK_Architecture_Report.md) — תכנון ויעדים; יש להשוות למימוש בפועל.
- [סכמת המסמך](schemas/document/tok_document_schema.json)
- [סכמת FlatBuffers המתוכננת](schemas/flatbuffers/tok_ipc.fbs)
- [הרישיון שבמאגר](LICENSE.md)
