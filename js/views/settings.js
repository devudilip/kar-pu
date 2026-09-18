import { store } from '../store.js';
import { SUBJECTS, syllabus } from '../data.js';
import { showTour } from './tour.js';
import { el, toast } from '../ui.js';

export default async function settings() {
  const st = store.get();
  const node = el(`<div>
    <h1>Settings</h1>
    <div class="card" style="border-color:var(--primary)">
      <h3 style="margin-top:0">Feedback</h3>
      <p class="muted">Found a wrong answer, a typo, or have an idea? It takes one minute and helps every student after you.</p>
      <a class="btn" href="https://forms.gle/YW9CKJa22dX5C2ph8" target="_blank" rel="noopener">Open feedback form →</a>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Your progress</h3>
      <p class="muted">Everything is saved only on this phone. Export a backup before changing phones or clearing browser data.</p>
      <div class="row">
        <button class="btn secondary" id="exp">Export backup</button>
        <label class="btn secondary" for="impFile">Import backup</label><input type="file" id="impFile" accept="application/json" class="hidden">
        <button class="btn danger" id="reset">Reset all progress</button>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Offline use</h3>
      <p class="muted">Chapters you open are saved automatically. Tap below once on Wi-Fi to save every chapter, then the whole app works without internet.</p>
      <button class="btn" id="saveAll">Save all chapters for offline</button>
      <div class="muted" id="saveStatus" style="margin-top:6px"></div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">How to use this app well</h3>
      <button class="btn secondary small" id="tourBtn" style="margin-bottom:8px">Show the welcome tour again</button>
      <ol class="muted" style="padding-left:1.2rem">
        <li>Read the chapter <b>Notes</b> once, then attempt <b>Practice</b>. Read every explanation, even for correct answers.</li>
        <li>Finish a chapter, then re-attempt only your <b>Mistakes</b> two days later.</li>
        <li>Every week, take one full <b>mock</b> per subject with the timer on. Aim for under 60 seconds per question.</li>
        <li>In the last month, solve all <b>previous year papers</b>. KCET repeats concepts and often near-identical questions.</li>
        <li>Never skip in the real exam. There is no negative marking.</li>
      </ol>
    </div>
    <div class="card">
      <h3 style="margin-top:0">About this app</h3>
      <p class="muted">Free, non-profit and open source. No ads, no account, no personal tracking — your progress stays on this device only (anonymous visit counts via Cloudflare Web Analytics, no cookies). Built to help Karnataka students, especially those far from coaching centres, prepare for KCET.</p>
      <p class="muted"><b>Not official.</b> This app is not affiliated with KEA or the PU Board. Past-paper answers follow the official KEA keys; other questions were written and checked by volunteers and AI assistants and <b>may contain mistakes</b>. Use "Report a mistake" under any question.</p>
      <p class="muted">Want to contribute questions, corrections or translations? <a href="https://github.com/devudilip/kar-pu" target="_blank" rel="noopener">github.com/devudilip/kar-pu</a></p>
    </div>
    <div class="card muted">
      <b>KCET Prep</b> by <a href="https://sirigannada.in" target="_blank" rel="noopener">Sirigannada</a> · v1.2 · MIT / CC BY 4.0 · Official exam information: <a href="https://cetonline.karnataka.gov.in" target="_blank" rel="noopener">cetonline.karnataka.gov.in</a>
    </div>
  </div>`);
  node.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { store.setSetting('lang', b.dataset.lang); toast('Language updated'); location.reload(); }));
  node.querySelector('#tourBtn').addEventListener('click', () => showTour());
  node.querySelector('#saveAll').addEventListener('click', async (e) => {
    const btn = e.target, status = node.querySelector('#saveStatus');
    btn.disabled = true;
    try {
      const syl = await syllabus();
      const files = [];
      for (const s of SUBJECTS) for (const c of syl[s.id]) if (c.count) { files.push(`data/questions/${s.id}/${c.file}`); files.push(`data/kn/${s.id}/${c.file}`); }
      let done = 0;
      for (const f of files) { try { await fetch(f, { cache: 'reload' }); } catch {} done++; status.textContent = `Saving ${done}/${files.length}…`; }
      status.textContent = `All ${files.length} chapters saved. You can use the app offline now.`;
      toast('Saved for offline');
    } catch (err) { status.textContent = 'Could not save: ' + err.message; }
    btn.disabled = false;
  });
  node.querySelector('#exp').addEventListener('click', () => {
    const blob = new Blob([store.export()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `kcet-prep-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  });
  node.querySelector('#impFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { store.import(await f.text()); toast('Backup restored'); location.hash = '#/'; } catch { alert('Invalid backup file'); }
  });
  node.querySelector('#reset').addEventListener('click', () => { if (confirm('Delete all your progress, tests and bookmarks on this device?')) { store.reset(); toast('Progress cleared'); location.hash = '#/'; } });
  return node;
}
