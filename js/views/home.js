import { SUBJECTS, syllabus, KCET, flashcards } from '../data.js';
import { store } from '../store.js';
import { el, esc, fmtDate, toast } from '../ui.js';
import { buildPlan, taskLink } from './plan.js';

const FEEDBACK = 'https://forms.gle/YW9CKJa22dX5C2ph8';

export default async function home() {
  const syl = await syllabus();
  const st = store.get();
  const plan = store.plan();
  const today = store.today();
  const dailyDone = !!store.daily(today);
  const attempted = Object.keys(st.attempts).length;
  const streak = store.streak();

  // Cards due today across subjects (only cards seen before)
  let due = 0;
  for (const s of SUBJECTS) { const fc = await flashcards(s.id); fc.chapters.forEach((c) => c.cards.forEach((_, i) => { const k = store.card(`${s.id}/${c.slug}/${i}`); if (k.lvl > 0 && k.next <= Date.now()) due++; })); }

  const todayPlan = plan?.days.find((d) => d.date === today);
  const chapterTask = todayPlan?.tasks.find((t) => t.type === 'chapter' || t.type === 'revise');
  const mockTask = todayPlan?.tasks.find((t) => t.type === 'mock' || t.type === 'pyq');
  const daysLeft = plan ? plan.days.filter((d) => d.date >= today).length : null;

  const node = el(`<div>
    <div class="card hero">
      <div class="kicker">ಉಚಿತ · Free for every Karnataka student</div>
      <h1>KCET ಗೆ ಸಿದ್ಧರಾಗಿ. Get ready for KCET.</h1>
      <p class="muted" style="margin:0 0 10px">Notes, 2900+ practice questions, 18 years of real KCET papers, flashcards and timed tests. Works offline. No fees, no login.</p>
      ${plan ? `<div class="row"><span class="pill">📅 ${daysLeft} days to exam</span><span class="pill ${streak ? 'ok' : ''}">🔥 ${streak}-day streak</span><span class="pill">${attempted} questions done</span></div>` : ''}
    </div>

    ${plan ? '' : `<div class="card" style="border-color:var(--primary)">
      <div class="kicker">Start here · ಇಲ್ಲಿಂದ ಪ್ರಾರಂಭಿಸಿ</div>
      <h2 style="margin:4px 0 6px">When is your KCET exam?</h2>
      <p class="muted">We will make a day-by-day plan for you. You can change it any time.</p>
      <div class="row">
        <input type="date" id="examDate" value="${defaultExam()}" style="font-size:1rem;padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:var(--card)">
        <select id="hours" style="font-size:1rem;padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:var(--card)">
          <option value="2">2 hours a day</option><option value="3" selected>3 hours a day</option><option value="4">4 hours a day</option><option value="6">6 hours a day</option>
        </select>
        <button class="btn" id="makePlan">Make my plan →</button>
      </div>
    </div>`}

    <div class="kicker" style="margin:14px 0 6px">${plan ? "Today's 3 things · ಇಂದಿನ ಮೂರು ಕೆಲಸ" : 'How to use · ಹೇಗೆ ಬಳಸುವುದು'}</div>
    <div class="steps">
      <a class="step ${dailyDone ? 'done' : ''}" href="#/today"><span class="num">${dailyDone ? '✓' : '1'}</span><span><b>Daily 10 · ದಿನದ 10 ಪ್ರಶ್ನೆ</b><span class="muted">${dailyDone ? 'Done for today. Come back tomorrow to keep the streak.' : 'Ten quick questions. Takes 8 minutes. Keeps your streak alive.'}</span></span><span class="go">Go →</span></a>
      ${chapterTask ? `<a class="step ${chapterTask.done ? 'done' : ''}" href="${linkOf(chapterTask)}"><span class="num">${chapterTask.done ? '✓' : '2'}</span><span><b>${esc(chapterTask.title.split(' — ')[0])}</b><span class="muted">${chapterTask.type === 'revise' ? 'Revise: mistakes + flashcards' : 'Read the notes, then practise the questions'} · ${chapterTask.hours} h</span></span><span class="go">Open →</span></a>`
                     : `<a class="step" href="#/subject/physics"><span class="num">2</span><span><b>Learn a chapter · ಒಂದು ಅಧ್ಯಾಯ ಕಲಿಯಿರಿ</b><span class="muted">Read short notes, then answer 40 questions with explanations.</span></span><span class="go">Pick →</span></a>`}
      ${mockTask ? `<a class="step ${mockTask.done ? 'done' : ''}" href="${linkOf(mockTask)}"><span class="num">${mockTask.done ? '✓' : '3'}</span><span><b>${esc(mockTask.title.split(' (')[0])}</b><span class="muted">Timed like the real exam · ${mockTask.hours} h</span></span><span class="go">Start →</span></a>`
                  : `<a class="step" href="#/flashcards"><span class="num">3</span><span><b>Revise flashcards · ಫ್ಲ್ಯಾಶ್‌ಕಾರ್ಡ್</b><span class="muted">${due ? `${due} cards are due for review today.` : 'Formulas and facts, one tap to flip.'}</span></span><span class="go">Revise →</span></a>`}
    </div>

    <h2>Subjects · ವಿಷಯಗಳು</h2>
    ${SUBJECTS.map((s) => { const ch = syl[s.id]; const tot = ch.reduce((a, c) => a + (c.count || 0), 0); return `<a class="card link subject-card" data-s="${s.id}" href="#/subject/${s.id}">
      <div class="row spread"><b style="font-size:1.1rem">${s.name}</b><span class="pill">${KCET.questionsPerSubject} Qs · ${KCET.minutesPerSubject} min</span></div>
      <div class="muted">${ch.length} chapters · ${tot} practice questions</div>
    </a>`; }).join('')}

    <h2>More tools · ಇನ್ನಷ್ಟು</h2>
    <div class="grid two">
      <a class="card link" href="#/pyq"><b>📚 Past papers · ಹಳೆಯ ಪ್ರಶ್ನೆಪತ್ರಿಕೆ</b><div class="muted">KCET 2009 to 2026, timed, with answers.</div></a>
      <a class="card link" href="#/tests"><b>📝 Mock tests</b><div class="muted">Full 60-question papers, exam pattern.</div></a>
      <a class="card link" href="#/speed"><b>⏱ Speed training</b><div class="muted">60-second drills. Learn to skip and return.</div></a>
      <a class="card link" href="#/rank"><b>🎯 Rank calculator</b><div class="muted">Board marks + CET marks → rank estimate.</div></a>
      <a class="card link" href="#/plan"><b>📆 My study plan</b><div class="muted">${plan ? `${daysLeft} days left · edit plan` : 'Day-by-day schedule to your exam.'}</div></a>
      <a class="card link" href="#/progress"><b>📈 Progress & mistakes</b><div class="muted">Weak chapters and why you go wrong.</div></a>
    </div>

    <div class="card">
      <b>KCET facts · ನೆನಪಿಡಿ</b>
      <ul class="muted" style="padding-left:1.2rem;margin:6px 0 0">
        <li>60 questions per subject, 80 minutes, 1 mark each. <b>No negative marking</b> — answer everything.</li>
        <li>Rank = 50% board PCM marks + 50% CET marks. The board exam matters just as much.</li>
      </ul>
    </div>
    <p class="muted" style="text-align:center">Found a mistake or have an idea? <a href="${FEEDBACK}" target="_blank" rel="noopener">Tell us · ಅಭಿಪ್ರಾಯ ತಿಳಿಸಿ</a> · <a href="#/settings">Settings</a></p>
  </div>`);

  node.querySelector('#makePlan')?.addEventListener('click', async (e) => {
    const date = node.querySelector('#examDate').value, hours = +node.querySelector('#hours').value;
    if (!date || new Date(date) <= new Date()) return alert('Please pick a future exam date');
    e.target.disabled = true; e.target.textContent = 'Building…';
    store.setPlan(await buildPlan(date, hours));
    toast('Your plan is ready!');
    location.reload();
  });
  return node;
}
function linkOf(t) { return t.type === 'chapter' ? `#/chapter/${t.subject}/${t.slug}` : t.type === 'revise' ? `#/flashcards/${t.subject}/${t.slug}` : t.type === 'mock' ? '#/tests' : t.type === 'pyq' ? '#/pyq' : '#/today'; }
function defaultExam() { const d = new Date(); d.setMonth(d.getMonth() + 4); return d.toISOString().slice(0, 10); }
