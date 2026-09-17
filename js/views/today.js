import { SUBJECTS, syllabus, chapter, allQuestions, seededRandom, seededShuffle, shuffle } from '../data.js';
import { store } from '../store.js';
import { el, esc, math, quiz, toast } from '../ui.js';
import { taskLink } from './plan.js';

export default async function today() {
  const dateKey = store.today();
  const seed = parseInt(dateKey.replace(/-/g, ''), 10);
  const rnd = seededRandom(seed);
  const syl = await syllabus();

  // Topic of the day: a chapter with questions, weighted by KCET weight, same for every student on a given day.
  const pool = [];
  for (const s of SUBJECTS) for (const c of syl[s.id]) if (c.count) for (let k = 0; k < c.weight; k++) pool.push({ s: s.id, c });
  const pick = pool[Math.floor(rnd() * pool.length)];
  const topic = await chapter(pick.s, pick.c.slug);
  const topicQs = seededShuffle(topic.questions, rnd).slice(0, 5);

  // Daily 10: mixed across subjects, same set for everyone today.
  const all = await allQuestions(SUBJECTS.map((s) => s.id));
  const bySub = Object.fromEntries(SUBJECTS.map((s) => [s.id, seededShuffle(all.filter((q) => q.subject === s.id), rnd)]));
  const daily = [...bySub.physics.slice(0, 4), ...bySub.chemistry.slice(0, 3), ...bySub.maths.slice(0, 3)];

  const done = store.daily(dateKey);
  const streak = store.streak();
  const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); return { k, on: !!store.daily(k), label: 'SMTWTFS'[d.getDay()] }; });

  const node = el(`<div>
    <div class="row spread"><h1>Today</h1><span class="pill ${streak ? 'ok' : ''}">🔥 ${streak}-day streak</span></div>
    <div class="row" style="gap:6px;margin-bottom:8px">${last7.map((d) => `<span title="${d.k}" style="width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:.75rem;font-weight:600;background:${d.on ? 'var(--ok)' : '#e2e8f0'};color:${d.on ? '#fff' : 'var(--muted)'}">${d.label}</span>`).join('')}</div>

    ${planBlock()}
    <div class="card">
      <div class="row spread"><h2 style="margin:0">Daily 10</h2>${done ? `<span class="pill ok">Done · ${done.correct}/${done.done}</span>` : '<span class="pill">~8 min</span>'}</div>
      <p class="muted">Ten mixed questions (4 Physics, 3 Chemistry, 3 Maths). Everyone gets the same set today — compare with friends.</p>
      <div id="dailyBox">${done ? '<button class="btn secondary" id="redo">Practise again</button>' : '<button class="btn" id="startDaily">Start Daily 10</button>'}</div>
    </div>

    <div class="card">
      <div class="row spread"><h2 style="margin:0">Topic of the day</h2><span class="pill">~${pick.c.weight} Q in KCET</span></div>
      <p><b>${esc(topic.title)}</b> <span class="muted">· ${SUBJECTS.find((s) => s.id === pick.s).name} · ${topic.puc === 1 ? '1st' : '2nd'} PUC</span></p>
      <div class="row"><a class="btn secondary" href="#/chapter/${pick.s}/${pick.c.slug}">Read notes</a><button class="btn" id="startTopic">5 quick questions</button><a class="btn ghost" href="#/flashcards/${pick.s}/${pick.c.slug}">Flashcards</a></div>
      <div id="topicBox" style="margin-top:10px"></div>
    </div>

    <div class="card">
      <div class="row spread"><h2 style="margin:0">Surprise me</h2><button class="btn small" id="surprise">Random question</button></div>
      <div id="surpriseBox" style="margin-top:10px"></div>
    </div>
  </div>`);

  node.querySelectorAll('.plan-task').forEach((c) => c.addEventListener('change', () => store.togglePlanTask(c.dataset.d, c.dataset.k)));
  const dailyBox = node.querySelector('#dailyBox');
  const runDaily = () => {
    dailyBox.innerHTML = '<div id="dq"></div>';
    quiz(dailyBox.querySelector('#dq'), daily, {
      record: (q, ok) => store.recordAttempt(q.id, ok),
      onDone: (r) => {
        if (!store.daily(dateKey)) { store.setDaily(dateKey, r); toast(`Daily done! Streak: ${store.streak()} days`); }
        dailyBox.innerHTML = `<div style="text-align:center"><div class="score-big">${r.correct}/${r.done}</div><div class="muted">${r.correct >= 8 ? 'Excellent. Keep the streak alive tomorrow.' : r.correct >= 5 ? 'Good. Revise the ones you missed in Progress → Mistakes.' : 'Tough day. Open the chapter notes for the questions you missed.'}</div><div class="row" style="justify-content:center;margin-top:8px"><a class="btn secondary" href="#/progress">See mistakes</a><a class="btn" href="#/tests">Take a full test</a></div></div>`;
        node.querySelector('.pill').textContent = `🔥 ${store.streak()}-day streak`;
      }
    });
  };
  node.querySelector('#startDaily')?.addEventListener('click', runDaily);
  node.querySelector('#redo')?.addEventListener('click', runDaily);

  node.querySelector('#startTopic').addEventListener('click', (e) => {
    e.target.disabled = true;
    const box = node.querySelector('#topicBox');
    quiz(box, topicQs, { record: (q, ok) => store.recordAttempt(q.id, ok), onDone: (r) => { box.innerHTML = `<div class="explain"><b>${r.correct}/${r.done}</b> — <a href="#/chapter/${pick.s}/${pick.c.slug}?tab=practice">practise the full chapter (${topic.questions.length} Qs)</a></div>`; } });
  });

  node.querySelector('#surprise').addEventListener('click', () => {
    const q = shuffle(all)[0];
    const box = node.querySelector('#surpriseBox');
    const meta = syl[q.subject].find((c) => c.slug === q.chapter);
    box.innerHTML = `<div class="muted" style="margin-bottom:4px"><a href="#/chapter/${q.subject}/${q.chapter}">${esc(meta?.title || '')}</a></div><div id="sq"></div>`;
    quiz(box.querySelector('#sq'), [q], { record: (qq, ok) => store.recordAttempt(qq.id, ok), onDone: () => { box.innerHTML = '<div class="muted">Tap "Random question" for another.</div>'; } });
  });
  return node;
}

function planBlock() {
  const p = store.plan();
  if (!p) return `<div class="card"><div class="row spread"><b>No study plan yet</b><a class="btn small" href="#/plan">Build one</a></div></div>`;
  const d = p.days.find((x) => x.date === store.today());
  if (!d) return `<div class="card"><div class="row spread"><b>Plan ended</b><a class="btn small" href="#/plan">Regenerate</a></div></div>`;
  const left = p.days.filter((x) => x.date >= store.today()).length;
  return `<div class="card"><div class="row spread"><h2 style="margin:0">Today's plan</h2><a class="pill" href="#/plan">${left} days to exam</a></div>
    ${d.tasks.map((t) => `<label class="row" style="margin:6px 0;align-items:flex-start"><input type="checkbox" class="plan-task" data-d="${d.date}" data-k="${t.key}" ${t.done ? 'checked' : ''}> <span>${taskLink(t)} <span class="muted">· ${t.hours} h</span></span></label>`).join('')}</div>`;
}
