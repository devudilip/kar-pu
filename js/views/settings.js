import { store } from '../store.js';
import { SUBJECTS, syllabus } from '../data.js';
import { el, toast } from '../ui.js';

export default async function settings() {
  const st = store.get();
  const node = el(`<div>
    <h1>Settings</h1>
    <div class="card" style="border-color:var(--primary)">
      <h3 style="margin-top:0">Feedback · ಅಭಿಪ್ರಾಯ</h3>
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
      <h3 style="margin-top:0">Language / ಭಾಷೆ</h3>
      <p class="muted">Questions stay in English (as in the KCET paper). Notes and explanations can be shown in Kannada where a translation exists.</p>
      <div class="row"><button class="btn ${store.lang() === 'en' ? '' : 'secondary'}" data-lang="en">English</button><button class="btn ${store.lang() === 'kn' ? '' : 'secondary'}" data-lang="kn">ಕನ್ನಡ (Kannada)</button></div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Offline use</h3>
      <p class="muted">Chapters you open are saved automatically. Tap below once on Wi-Fi to save every chapter, then the whole app works without internet.</p>
      <button class="btn" id="saveAll">Save all chapters for offline</button>
      <div class="muted" id="saveStatus" style="margin-top:6px"></div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">How to use this app well</h3>
      <ol class="muted" style="padding-left:1.2rem">
        <li>Read the chapter <b>Notes</b> once, then attempt <b>Practice</b>. Read every explanation, even for correct answers.</li>
        <li>Finish a chapter, then re-attempt only your <b>Mistakes</b> two days later.</li>
        <li>Every week, take one full <b>mock</b> per subject with the timer on. Aim for under 60 seconds per question.</li>
        <li>In the last month, solve all <b>previous year papers</b>. KCET repeats concepts and often near-identical questions.</li>
        <li>Never skip in the real exam. There is no negative marking.</li>
      </ol>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Contribute questions (teachers & volunteers)</h3>
      <p class="muted">This app is free and open. Questions live in simple JSON files under <code>data/questions/&lt;subject&gt;/</code>. Previous year papers go under <code>data/pyq/</code>. A spreadsheet-to-JSON converter is in <code>tools/</code>. See README.md in the project for the format.</p>
    </div>
    <div class="card muted">
      <b>ಪಿಯು · KCET Prep</b> by <a href="https://sirigannada.in" target="_blank" rel="noopener">Sirigannada</a> · v1.1 · Built for Karnataka students preparing for KCET Engineering (PCM). Official information: <a href="https://cetonline.karnataka.gov.in" target="_blank" rel="noopener">cetonline.karnataka.gov.in</a>. This app is not affiliated with KEA.
    </div>
  </div>`);
  node.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { store.setSetting('lang', b.dataset.lang); toast(b.dataset.lang === 'kn' ? 'ಕನ್ನಡ ವಿವರಣೆಗಳು ಆನ್' : 'English explanations on'); location.reload(); }));
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
