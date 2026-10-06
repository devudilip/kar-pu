# KCET Prep — agent rules

Read `README.md`, `CONTRIBUTING.md`, and `RUNBOOK.md` first. They cover the data format, the
validators, the service-worker release rule (`VERSION` in `sw.js`), and how to fix a wrong answer.

## The family handbook (owner rule, 2026-10-06)

KCET Prep is one of several products published under the **Sirigannada** name
(`https://www.sirigannada.in/apps`). Everything that spans more than one product has a single
source of truth that lives **outside this repo**, on the owner's machine:

`/Users/devudilip/projects/ideas/sirigannda/alldocs/SIRIGANNADA-FAMILY.md`

It records domains and DNS, Cloudflare rules (the apex → www redirect, HSTS with
`includeSubDomains`), the Cloudflare Pages projects (`kar-pu` serves `pu.sirigannada.in` with no
build step), repo settings and CI, release steps, Play Store plans and packages, the privacy and
analytics commitments every product shares (no analytics script, no cookies, no account), brand
and contact channels, and where secrets live.

- **Read its sections 1–2 at session start** when the task touches the domain, hosting, `_headers`,
  `sw.js` scope, `manifest.webmanifest`, `#/privacy`, the "BY SIRIGANNADA" links, a store listing,
  analytics, or another Sirigannada product.
- **Before the session ends, edit that file and append a line to its change log** if the session
  changed any of those. A PR in that area is not done until the family handbook says so.
- If you are an outside contributor without that file, say so in the PR; the maintainer updates it.

## Rules that must not drift from the family handbook

- No analytics script, no cookies, no account, no server. Progress lives only in `localStorage`
  (`kcet.prep.v1`). The Cloudflare Web Analytics beacon was removed on 2026-10-06; do not re-add it
  or any tracker without changing `#/privacy` and the family handbook first.
- Keep `#/privacy` (`js/views/privacy.js`) true to the code and dated.
- "KCET Prep by Sirigannada" links back to `https://www.sirigannada.in/apps` (header and Settings).
- Never rename the `pu.sirigannada.in` host; installed PWAs and shared links would orphan.
- A future store app gets its own package (`in.sirigannada.pu` or similar), its own
  `.well-known/assetlinks.json` on this host, and its own listing; it is never bundled into the
  main Sirigannada Android app.
- Commits: `git commit -s` (DCO), plain imperative subjects, no AI attribution lines.
