# KCET Prep — free, offline-first KCET Engineering practice (PWA)

One place for Karnataka students to prepare for KCET (Physics, Chemistry, Mathematics):
chapter notes and formulas, chapter-wise MCQs with explanations, formula flashcards with spaced repetition, a Daily 10 with streaks,
previous-year papers, and full-length timed mock tests in the exact KCET pattern. No login, no fees, works offline after the first visit.

## Run locally
Any static file server works (the app is plain HTML/CSS/JS, no build step):

```bash
python3 -m http.server 8080
```
Open http://localhost:8080. On a phone on the same Wi-Fi, use your computer's IP.

## Deploy (Cloudflare Pages, free)
The site is static, no build step. `_headers` sets cache rules so updates reach installed apps quickly.
1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick `devudilip/kar-pu`.
2. Build settings: Framework preset **None**, build command **(empty)**, build output directory **/** (root).
3. Deploy. Then Custom domains → add `pu.sirigannada.in` (Cloudflare adds the CNAME automatically since the zone is already there).
Every push to `main` redeploys. GitHub Pages / Netlify / Vercel also work with the same settings.

## Project layout
```
index.html            app shell
manifest.webmanifest  PWA manifest
sw.js                 service worker (offline cache; bump VERSION when you change files)
css/style.css
js/                   router, store (localStorage progress), data loader, views
data/syllabus.json    chapters per subject, PUC year, approximate KCET weightage, question file name
data/questions/<subject>/<chapter>.json   notes + questions for one chapter
data/pyq/index.json   list of previous-year papers; papers in data/pyq/<file>.json
data/flashcards/<subject>.json  formula/fact flashcards per chapter ({chapters:[{slug, cards:[{f,b}]}]})
tools/csv2json.mjs    convert a spreadsheet of questions into JSON
```

## Quality checks
```bash
node tools/validate.mjs   # validates every chapter file and writes question counts into syllabus.json
```
Run this after adding or editing questions. It fails on missing options, bad answer indexes, or duplicate ids.

## Adding questions (teachers & volunteers)
Each chapter file looks like:
```json
{
  "notes": "<h3>Key formulas</h3><ul><li>$v = u + at$</li></ul>",
  "questions": [
    {
      "id": "phy-lom-001",
      "q": "A block slides down a frictionless incline of angle $30^\\circ$. Its acceleration is",
      "options": ["$g$", "$g/2$", "$g\\sqrt{3}/2$", "$2g$"],
      "answer": 1,
      "explanation": "Along the incline $a = g\\sin\\theta = g\\sin 30^\\circ = g/2$.",
      "difficulty": "easy",
      "tags": ["incline"],
      "tip": "Frictionless → only $g\\sin\\theta$ acts along the plane."
    }
  ]
}
```
- `answer` is the 0-based index (0 = A, 1 = B, 2 = C, 3 = D).
- Maths goes inside `$...$` (KaTeX). In JSON, backslashes must be doubled: `\\frac{1}{2}`.
- `id` must be unique across the whole app (progress is stored by id). Convention: `<sub>-<chapter-abbr>-<nnn>`.
- Notes are HTML (`<h3>`, `<ul>`, `<table>` supported).
- To create a new chapter file, add `"file": "<name>.json"` to that chapter in `data/syllabus.json`.

Prefer a spreadsheet? Fill columns `id, question, a, b, c, d, answer, explanation, difficulty, tags, tip`, export CSV, then:
```bash
node tools/csv2json.mjs my-questions.csv --merge data/questions/physics/laws-of-motion.json
```

## Adding previous-year papers
KEA publishes every KCET question paper and final answer key free at https://kea.kar.nic.in.
1. Save the PDFs as `data/pyq/raw/<year>-<subject>.pdf` and `data/pyq/raw/<year>-<subject>-key.pdf`.
2. Extract text (uses the PDF text layer, or Tesseract OCR for scanned pages):
   ```bash
   tools/.venv/bin/python tools/pyq-extract.py data/pyq/raw/2024-physics.pdf
   ```
   (one-time setup: `python3 -m venv tools/.venv && tools/.venv/bin/pip install pymupdf`, and `brew install tesseract`)
3. Turn the `.txt` into the CSV format above (question, a, b, c, d, answer from the official key, chapter title), then:
```bash
node tools/csv2json.mjs kcet-2024-physics.csv --pyq "KCET 2024 Physics" --subject physics > data/pyq/2024-physics.json
```
and add an entry to `data/pyq/index.json`:
```json
{ "year": 2024, "subject": "physics", "file": "2024-physics.json", "count": 60 }
```
Add a `chapter` column (chapter title) to each row so students see which chapter each PYQ belongs to.

## Exam facts baked into the app
- 60 questions per subject, 1 mark each, 80 minutes per paper, **no negative marking**.
- Syllabus: 1st + 2nd PUC (Karnataka PU Board, aligned to NCERT).
- Mock tests draw questions across chapters in proportion to typical KCET weightage (`weight` in syllabus.json).

## Roadmap
- Grow each chapter from ~18 to 40+ questions (all 74 chapters currently have notes + 14–20 verified questions, 1392 total).
- Add official PYQs 2015–2025 with chapter tags.
- Kannada-medium toggle.
- Optional sync (so a student can move between devices) — must stay free and login-optional.

Not affiliated with KEA. Official info: https://cetonline.karnataka.gov.in
