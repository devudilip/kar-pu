# Contributing

Thank you. The most valuable contribution is a **correct answer**: one wrong key costs a student's trust.

## Run it locally

Any static server works — there is no build step.

```bash
python3 -m http.server 8080
```

Open http://localhost:8080. Node 18+ is needed only for the validator scripts.

## Project layout

```
index.html, sw.js, manifest.webmanifest   app shell and offline service worker
css/style.css
js/                     router, store (progress in localStorage), data loader, views/
data/syllabus.json      chapters, weights (derived from real papers), question counts
data/questions/<subject>/<chapter>.json   notes + questions
data/kn/<subject>/<chapter>.json          Kannada notes + explanations (parked, not shown yet)
data/flashcards/<subject>.json            formula/fact cards
data/pyq/<year>-<subject>.json            past papers; data/pyq/index.json is generated
tools/                  validators and converters
```

## Fixing or adding questions

Each question looks like:

```json
{
  "id": "phy-laws-of-motion-012",
  "q": "A block slides down a frictionless incline of angle $30^\\circ$. Its acceleration is",
  "options": ["$g$", "$g/2$", "$g\\sqrt{3}/2$", "$2g$"],
  "answer": 1,
  "explanation": "Along the incline $a = g\\sin\\theta = g/2$.",
  "trick": "Frictionless incline: only $g\\sin\\theta$ acts.",
  "difficulty": "easy"
}
```

- `answer` is the 0-based index (0 = A … 3 = D).
- Maths goes in `$...$` (KaTeX). Inside JSON, backslashes are doubled (`\\frac`). Chemical formulas as `H$_2$O`.
- `id` must be `<phy|che|mat>-<chapter-slug>-<nnn>`; the app computes progress from that prefix. Append new questions at the end and continue the numbering; never renumber existing ones.
- Keep the correct option position varied. Never reference "the previous question".

Then run:

```bash
node tools/validate.mjs        # structure, ids, counts written into syllabus.json
node tools/validate-kn.mjs     # Kannada files (if you touched them)
```

Prefer a spreadsheet? Use `tools/template.csv` and `node tools/csv2json.mjs my.csv --merge data/questions/physics/laws-of-motion.json`.

## Adding or correcting a past paper

Papers live in `data/pyq/<year>-<subject>.json` with the version code used, the KEA key applied (grace marks, multiple accepted answers and excluded questions are honoured), a chapter tag per question, and a short solution. If you correct an answer, check the **official KEA key column for that version code**, not a coaching site's answer.

```bash
node tools/validate-pyq.mjs           # validates all papers and regenerates data/pyq/index.json
node tools/pyq-weights.mjs            # refreshes chapter weights from the last 5 papers
```

To transcribe a new paper: `tools/pyq-render.py` renders KEA PDFs to page images (needs `pip install pymupdf`), then transcribe question by question.

## Translations

`data/kn/<subject>/<chapter>.json` holds `{ "notes": "...", "explanations": { "<id>": "..." } }`. Keep all maths and HTML identical to the English source; translate only the prose. The Kannada UI is switched off until the whole app (labels and content) can ship in Kannada at once.

## Code

Vanilla ES modules, no framework, no dependencies to install. Keep pages usable on a cheap Android phone on 4G: load only the chapter files you need (see `sampleQuestions` and `questionsByIds` in `js/data.js`), and bump `VERSION` in `sw.js` whenever you change a shell file so installed apps pick it up.

## Reporting a problem

Use the in-app **Report a mistake** link (it copies the question ID) or the feedback form: https://forms.gle/YW9CKJa22dX5C2ph8. Please include the question ID or the paper and question number.
