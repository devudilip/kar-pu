# Runbook (maintainer)

Practical steps for the tasks that come up running KCET Prep. See README.md and CONTRIBUTING.md for the bigger picture.

## 1. Fix a wrong answer reported by a student

A report gives you either a **question id** or a **paper + question number**.

- **Question id** `<phy|che|mat>-<slug>-<nnn>` (e.g. `phy-laws-of-motion-012`): open
  `data/questions/<subject>/<slug>.json` (subject is `physics`/`chemistry`/`maths`; slug is the
  id's middle part) and find the object with that `id`.
- **Paper + Q number**: open `data/pyq/<year>-<subject>.json` and find the question with that `n`.

Edit `answer` (0-based index, 0=A), `explanation`, and `trick`/`tip` as needed. Then validate:

```bash
node tools/validate.mjs        # for data/questions/*
node tools/validate-pyq.mjs    # for data/pyq/*
```

Fix anything the validator flags, then commit and push:

```bash
git add data/... && git commit -m "Fix answer on <id or paper Q>" && git push
```

This is a data-only change — see "Releasing" below for why no `sw.js` bump is needed.

## 2. Releasing

- **Any app-shell file changes** (html/css/js listed in `sw.js`'s `SHELL` array, or a new file
  added to it): bump `VERSION` in `sw.js` (e.g. `kcet-v19` → `kcet-v20`). On install, the service
  worker re-fetches every shell file with `?v=VERSION` to bypass Cloudflare's edge cache, and
  already-installed apps detect the new service worker and reload themselves automatically
  (see `js/app.js`'s update-check / `sw.js`'s `message` listener for `SKIP_WAITING`).
- **Data-only changes** (anything under `data/`) need **no** version bump — the service worker
  fetches `/data/*` network-first, so users get the new JSON within Cloudflare's cache TTL (about
  5 minutes) without reinstalling anything.
- **Check the live version:**

```bash
curl -s "https://pu.sirigannada.in/sw.js?b=$RANDOM" | grep -o "kcet-v[0-9]*"
```

  Confirm it matches the `VERSION` you just pushed (allow a minute or two for Cloudflare Pages to build and deploy).

## 3. Adding a past paper

1. Render the KEA PDFs (question paper + answer key, from your local archive) to page images:
   ```bash
   tools/pyq-render.py <archive_root> <year>
   ```
   This writes PNGs under `data/pyq/raw/<year>-<subject>/`. (For plain text extraction instead,
   `tools/pyq-extract.py <pdf>` uses the PDF text layer with OCR fallback.)
2. Transcribe question by question into `data/pyq/<year>-<subject>.json` (or build a CSV and run
   `node tools/csv2json.mjs paper.csv --pyq "KCET <year> <Subject>" --subject <subject> > data/pyq/<year>-<subject>.json`).
   Tag each question's `chapter` with the syllabus chapter title, and use the **official KEA key
   for that paper's version code** — not a coaching site's key. Mark disputed questions with
   `disputed: true`.
3. Fix common KaTeX mistakes mechanically:
   ```bash
   node tools/fix-katex.mjs                  # all pyq files
   node tools/fix-katex.mjs 2024-physics.json  # just one
   ```
4. Validate and rebuild the papers index:
   ```bash
   node tools/validate-pyq.mjs
   ```
5. Refresh chapter weights (average questions per chapter over the last 5 papers):
   ```bash
   node tools/pyq-weights.mjs
   ```
6. Commit and push. No `sw.js` bump needed (data-only).

## 4. Adding questions to a chapter

Edit `data/questions/<subject>/<slug>.json`. Each question needs `id`, `q`, `options` (4, non-empty),
`answer` (0-3), `explanation`, and ideally a one-line exam `trick`. Rules:

- `id` is `<phy|che|mat>-<slug>-<nnn>` — the app derives per-chapter progress from this prefix.
- **Never renumber existing ids.** Append new questions at the end and continue the `nnn` sequence.
- Maths in `$...$` (KaTeX); backslashes doubled inside JSON strings (`\\frac`).
- Vary which option (A/B/C/D) is correct; don't write "see previous question".

Prefer a spreadsheet: fill `tools/template.csv`, then
`node tools/csv2json.mjs my.csv --merge data/questions/<subject>/<slug>.json`.

Validate before committing:

```bash
node tools/validate.mjs
```

## 5. Weekly routine checklist

1. Read the feedback form: https://forms.gle/YW9CKJa22dX5C2ph8
2. For each report, fix the question/paper (see sections 1, 3, 4 above).
3. Run the relevant validator(s) — `node tools/validate.mjs` and/or `node tools/validate-pyq.mjs`.
4. Commit, push, and release (bump `sw.js` `VERSION` only if you touched an app-shell file).
5. Glance at Cloudflare Web Analytics for the site for anything unusual (traffic drop, spike in
   errors) — it's anonymous, cookie-less visit data only.

## 6. Troubleshooting

- **Student says the app looks old / a fix isn't showing.** Data-only fixes reach everyone within
  ~5 minutes automatically (network-first fetch). For shell changes, tell them to just reopen the
  app — the service worker checks for updates and reloads itself once the new version is cached.
- **iOS Safari: "Response served by service worker has redirections."** Caused by caching a
  response that was itself a redirect. `sw.js` already guards every cache write with
  `!res.redirected` (see the `cacheable()` helper and the install handler) — if this recurs after
  editing `sw.js`, check that guard wasn't removed on a new fetch path.
- **KaTeX not rendering / garbled formula.** Common causes: `\,^` or `\,_` needing a `{}` before
  the superscript/subscript, or double-escaped backslashes from a copy-paste. Run
  `node tools/fix-katex.mjs [file]` — it fixes these mechanically for `data/pyq/*` — then re-check
  by eye. For `data/questions/*`, apply the same fix by hand (the script only targets `data/pyq/`).
- **Run the app locally:**
  ```bash
  python3 -m http.server 8080
  ```
  Open http://localhost:8080. Node 18+ is only needed for the validator/tool scripts.
