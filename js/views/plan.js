import { SUBJECTS, PFX, syllabus } from '../data.js';
import { store } from '../store.js';
import { el, esc, fmtDate } from '../ui.js';

const dkey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

// Builds a day-by-day plan: learning phase (all chapters, weighted by KCET weight and weakness),
// then a revision phase (weak chapters + mocks + PYQs). Weekly mock days throughout.
export async function buildPlan(examDate, hoursPerDay) {
  const syl = await syllabus();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(examDate + 'T00:00:00');
  const totalDays = Math.max(1, Math.round((end - start) / 86400000));
  const revisionDays = Math.max(3, Math.min(21, Math.round(totalDays * 0.25)));
  const learnDays = Math.max(1, totalDays - revisionDays);

  // Chapter demand: weight × (1 + weakness). Weakness from accuracy so far; untouched chapters = 1.
  const chapters = [];
  for (const s of SUBJECTS) for (const c of syl[s.id]) {
    const st = c.count ? store.prefixStats(`${PFX[s.id]}-${c.slug}-`, c.count) : { attempted: 0, correct: 0, total: 0 };
    const acc = st.attempted >= 5 ? st.correct / st.attempted : null;
    const weakness = acc === null ? 1 : acc >= 0.8 ? 0.2 : acc >= 0.6 ? 0.6 : 1.3;
    const done = acc !== null && acc >= 0.8 && st.attempted >= 10;
    chapters.push({ subject: s.id, slug: c.slug, title: c.title, weight: c.weight, puc: c.puc, weakness, acc, done, demand: c.weight * (1 + weakness) });
  }
  const learnHoursTotal = learnDays * hoursPerDay * 0.8; // 20% of every day goes to flashcards/daily 10
  const demandTotal = chapters.reduce((a, c) => a + c.demand, 0);
  chapters.forEach((c) => { c.hours = Math.max(0.5, Math.round(2 * learnHoursTotal * c.demand / demandTotal) / 2); c.left = c.hours; });

  // Order: rotate subjects, high-weight and weak first within each subject; chapters marked done go last.
  const queues = Object.fromEntries(SUBJECTS.map((s) => [s.id, chapters.filter((c) => c.subject === s.id).sort((a, b) => (a.done - b.done) || (b.demand - a.demand))]));
  const days = [];
  let si = 0;
  for (let d = 0; d < totalDays; d++) {
    const date = new Date(start); date.setDate(start.getDate() + d);
    const tasks = [];
    const isRevision = d >= learnDays;
    const weekly = d > 0 && d % 7 === 6;
    let budget = hoursPerDay;
    tasks.push({ key: 'daily', type: 'daily', title: 'Daily 10 + flashcards due', hours: 0.3 }); budget = Math.round((budget - 0.3) * 10) / 10;
    if (weekly || (isRevision && d % 2 === 1)) {
      const s = SUBJECTS[si % 3]; si++;
      tasks.push({ key: 'mock-' + s.id, type: 'mock', subject: s.id, title: `Full mock — ${s.name} (80 min) + review mistakes`, hours: 2 }); budget -= 2;
    }
    if (!isRevision) {
      let guard = 0;
      while (budget >= 0.5 && guard++ < 12) {
        const s = SUBJECTS[(d + guard) % 3].id;
        const q = queues[s].find((c) => c.left > 0) || SUBJECTS.map((x) => queues[x.id].find((c) => c.left > 0)).find(Boolean);
        if (!q) break;
        const h = Math.round(Math.min(q.left, budget, 2) * 10) / 10;
        q.left -= h; budget -= h;
        tasks.push({ key: `ch-${q.subject}-${q.slug}`, type: 'chapter', subject: q.subject, slug: q.slug, title: `${q.title} — ${q.left > 0 ? 'notes + practice (part)' : 'finish practice'}`, hours: h });
      }
    } else {
      const weak = chapters.filter((c) => !c.done).sort((a, b) => b.demand - a.demand);
      const pick = weak.slice((d - learnDays) * 2 % Math.max(1, weak.length), (d - learnDays) * 2 % Math.max(1, weak.length) + 2);
      for (const c of pick) if (budget >= 0.5) { tasks.push({ key: `rev-${c.subject}-${c.slug}`, type: 'revise', subject: c.subject, slug: c.slug, title: `Revise ${c.title} — mistakes + flashcards`, hours: 1 }); budget -= 1; }
      if (budget >= 1) { tasks.push({ key: 'pyq', type: 'pyq', title: 'Previous year paper (timed) + review', hours: Math.round(Math.min(budget, 1.5) * 10) / 10 }); }
    }
    days.push({ date: dkey(date), tasks });
  }
  return { examDate, hoursPerDay, created: Date.now(), totalDays, learnDays, revisionDays, days };
}

export default async function planView() {
  const plan = store.plan();
  const node = el(`<div>
    <h1>Study planner</h1>
    <div class="card" id="form">
      <p class="muted">Tell me your exam date and daily study hours. The plan covers every chapter in KCET-weight order, gives extra time to chapters you are weak in, adds a weekly full mock, and keeps the last weeks for revision and previous-year papers. Regenerate any time — it re-reads your progress.</p>
      <div class="stack">
        <label class="field">KCET exam date <input type="date" id="date" value="${plan?.examDate || defaultExam()}"></label>
        <label class="field">Study hours per day <input type="number" id="hours" value="${plan?.hoursPerDay || 3}" min="1" max="12" step="0.5"></label>
        <button class="btn block" id="gen">${plan ? 'Regenerate plan' : 'Build my plan'}</button>
      </div>
    </div>
    <div id="out"></div>
  </div>`);
  const out = node.querySelector('#out');
  const render = () => {
    const p = store.plan(); if (!p) return;
    const today = store.today();
    const total = p.days.reduce((a, d) => a + d.tasks.length, 0), done = p.days.reduce((a, d) => a + d.tasks.filter((t) => t.done).length, 0);
    out.innerHTML = `<div class="card"><div class="row spread"><b>${p.totalDays} days to exam</b><span class="pill">${p.learnDays} learning · ${p.revisionDays} revision</span></div><div class="muted">${done}/${total} tasks done</div><div class="progress" style="margin-top:6px"><span style="width:${100 * done / Math.max(1, total)}%"></span></div></div>
      ${p.days.filter((d) => d.date >= today).slice(0, 28).map((d) => `<div class="card" ${d.date === today ? 'style="border-color:var(--primary-2)"' : ''}>
        <div class="row spread"><b>${d.date === today ? 'Today' : fmtDate(new Date(d.date + 'T00:00:00'))}</b><span class="muted">${d.tasks.reduce((a, t) => a + t.hours, 0).toFixed(1)} h</span></div>
        ${d.tasks.map((t) => `<label class="row" style="margin:6px 0;align-items:flex-start"><input type="checkbox" data-d="${d.date}" data-k="${t.key}" ${t.done ? 'checked' : ''}> <span>${taskLink(t)} <span class="muted">· ${t.hours} h</span></span></label>`).join('')}
      </div>`).join('')}
      <p class="muted">Showing the next 4 weeks.</p>`;
    out.querySelectorAll('input[type=checkbox]').forEach((c) => c.addEventListener('change', () => store.togglePlanTask(c.dataset.d, c.dataset.k)));
  };
  node.querySelector('#gen').addEventListener('click', async () => {
    const date = node.querySelector('#date').value, hours = +node.querySelector('#hours').value;
    if (!date || new Date(date) <= new Date()) return alert('Pick a future exam date');
    store.setPlan(await buildPlan(date, hours)); render(); window.scrollTo(0, 300);
  });
  render();
  return node;
}
export function taskLink(t) {
  if (t.type === 'chapter') return `<a href="#/chapter/${t.subject}/${t.slug}">${esc(t.title)}</a>`;
  if (t.type === 'revise') return `<a href="#/flashcards/${t.subject}/${t.slug}">${esc(t.title)}</a>`;
  if (t.type === 'mock') return `<a href="#/tests">${esc(t.title)}</a>`;
  if (t.type === 'pyq') return `<a href="#/pyq">${esc(t.title)}</a>`;
  if (t.type === 'daily') return `<a href="#/today">${esc(t.title)}</a>`;
  return esc(t.title);
}
function defaultExam() { const d = new Date(); d.setMonth(d.getMonth() + 3); return dkey(d); }
