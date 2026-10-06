import { el } from '../ui.js';

const UPDATED = '6 October 2026';

/** Privacy page: keep every sentence true to what the code does. No analytics script, no cookies, progress only in localStorage. */
export default function privacy() {
  return el(`<div>
    <h1>Privacy</h1>
    <p class="muted">KCET Prep (pu.sirigannada.in) is a free, open-source, non-profit app published by Sirigannada and maintained by Devaraj K. This page covers this site only. Last updated: ${UPDATED}.</p>
    <div class="card">
      <h3 style="margin-top:0">What stays on your device</h3>
      <p class="muted">Your progress, test results, streak, flashcard schedule, study plan, bookmarks, mistake tags and settings are saved only in this browser's storage on your phone or computer. They are never sent to us or anyone else. "Export backup" in Settings writes them to a file you keep; clearing the site's data deletes them.</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">No account, no tracking</h3>
      <p class="muted">There is no sign-up, no login, no analytics script and no cookies. Cloudflare, which hosts the site and delivers every page, counts visits from its own server records as totals only: pages requested, country and browser type. Like any web server, it sees your network address in order to send the page.</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Outside services</h3>
      <p class="muted">The maths formula renderer (KaTeX) and the Archivo font load from public CDNs; those servers see the same request any web page makes. The feedback form is on Google Forms and the source code is on GitHub, each under its own privacy policy. Give an email in the form only if you want a reply.</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Other Sirigannada apps</h3>
      <p class="muted">Sirigannada's Kannada dictionary and library at www.sirigannada.in and any other app under the same name are separate sites with separate storage and their own privacy pages. Nothing you save here is shared with them. <a href="https://www.sirigannada.in/apps" rel="noopener">See all Sirigannada apps →</a></p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Changes and questions</h3>
      <p class="muted">If this page changes, its date changes; earlier versions are on <a href="https://github.com/devudilip/kar-pu" target="_blank" rel="noopener">GitHub</a>. Questions go through the <a href="https://forms.gle/YW9CKJa22dX5C2ph8" target="_blank" rel="noopener">feedback form</a>.</p>
    </div>
    <p><a class="btn secondary" href="#/settings">← Back to Settings</a></p>
  </div>`);
}
