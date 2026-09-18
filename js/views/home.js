import { SUBJECTS, PFX, syllabus, KCET, flashcards } from '../data.js';
import { store } from '../store.js';
import { el, esc, fmtDate, toast, fmtTime } from '../ui.js';
import { buildPlan, taskLink } from './plan.js';
import { weekStats } from './report.js';

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
  // Continue: an unfinished test beats a remembered chapter/deck
  let cont = null;
  try { const ex = JSON.parse(sessionStorage.getItem('kcet.examState') || 'null'); if (ex && ex.qs) { const left = Math.max(0, Math.round((ex.endAt - Date.now()) / 1000)); const answered = ex.answers.filter((a) => a !== null).length; if (left > 0) cont = { href: '#/exam', title: ex.cfg.title, sub: `${answered} of ${ex.qs.length} answered · ${fmtTime(left)} left`, cta: 'Resume test' }; } } catch {}
  const last = store.last();
  if (!cont && last && Date.now() - last.t < 7 * 86400000) cont = { href: last.href, title: last.title, sub: last.sub, cta: 'Continue' };

  const isSunday = new Date().getDay() === 0; const ws = weekStats(); const reportSeen = st.settings.reportSeen === today;
  const node = el(`<div>
    ${installBanner()}
    ${isSunday && ws.n && !reportSeen ? `<a class="card link" href="#/report" style="border-color:var(--accent);background:#fff7e6"><div class="kicker">Sunday</div><div class="row spread" style="align-items:center"><span><b style="font-size:1.1rem">Your weekly report card is ready</b><div class="muted">${ws.n} questions this week · ${Math.round(100 * ws.c / Math.max(1, ws.n))}% correct</div></span><span class="btn small">Open →</span></div></a>` : ''}
    <div class="card hero">
      <div class="kicker">Free for every Karnataka student</div>
      <h1>Get ready for KCET.</h1>
      <p class="muted" style="margin:0 0 10px">Notes, 2900+ practice questions, 18 years of real KCET papers, flashcards and timed tests. Works offline. No fees, no login.</p>
      ${plan ? `<div class="row"><span class="pill">📅 ${daysLeft} days to exam</span><span class="pill ${streak ? 'ok' : ''}">🔥 ${streak}-day streak</span><span class="pill">${attempted} questions done</span></div>` : ''}
    </div>

    ${store.streakAtRisk() ? `<a class="card link" href="#/today" style="border-color:var(--bad);background:var(--bad-bg)"><b>🔥 Your ${streak}-day streak ends at midnight.</b> <span class="muted">Finish today's tasks →</span></a>` : ''}
    ${plan && daysLeft !== null && daysLeft <= 10 ? `<a class="card link" href="#/examday" style="border-color:var(--accent);background:#fff7e6"><b>🎒 ${daysLeft} days to go.</b> <span class="muted">Open your last-week plan and exam-day checklist →</span></a>` : ''}
    ${cont ? `<a class="card link" href="${cont.href}" style="border-color:var(--primary);background:#fbe9e4"><div class="kicker">Continue where you left off</div><div class="row spread" style="align-items:center"><span><b style="font-size:1.1rem">${esc(cont.title)}</b><div class="muted">${esc(cont.sub)}</div></span><span class="btn small">${cont.cta} →</span></div></a>` : ''}
    ${plan ? '' : `<div class="card" style="border-color:var(--primary)">
      <div class="kicker">Start here</div>
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

    <div class="kicker" style="margin:14px 0 6px">${plan ? "Today's 3 things" : 'How to use this app'}</div>
    <div class="steps">
      <a class="step ${dailyDone ? 'done' : ''}" href="#/today"><span class="num">${dailyDone ? '✓' : '1'}</span><span><b>Daily 10</b><span class="muted">${dailyDone ? 'Done for today. Come back tomorrow to keep the streak.' : 'Ten quick questions. Takes 8 minutes. Keeps your streak alive.'}</span></span><span class="go">Go →</span></a>
      ${chapterTask ? `<a class="step ${chapterTask.done ? 'done' : ''}" href="${linkOf(chapterTask)}"><span class="num">${chapterTask.done ? '✓' : '2'}</span><span><b>${esc(chapterTask.title.split(' — ')[0])}</b><span class="muted">${chapterTask.type === 'revise' ? 'Revise: mistakes + flashcards' : 'Read the notes, then practise the questions'} · ${chapterTask.hours} h</span></span><span class="go">Open →</span></a>`
                     : `<a class="step" href="#/subject/physics"><span class="num">2</span><span><b>Learn a chapter</b><span class="muted">Read short notes, then answer 40 questions with explanations.</span></span><span class="go">Pick →</span></a>`}
      ${mockTask ? `<a class="step ${mockTask.done ? 'done' : ''}" href="${linkOf(mockTask)}"><span class="num">${mockTask.done ? '✓' : '3'}</span><span><b>${esc(mockTask.title.split(' (')[0])}</b><span class="muted">Timed like the real exam · ${mockTask.hours} h</span></span><span class="go">Start →</span></a>`
                  : `<a class="step" href="#/flashcards"><span class="num">3</span><span><b>Revise flashcards</b><span class="muted">${due ? `${due} cards are due for review today.` : 'Formulas and facts, one tap to flip.'}</span></span><span class="go">Revise →</span></a>`}
    </div>

    <h2>Subjects</h2>
    ${SUBJECTS.map((s) => { const ch = syl[s.id]; const tot = ch.reduce((a, c) => a + (c.count || 0), 0); const done = Object.keys(st.attempts).filter((id) => id.startsWith(PFX[s.id] + '-')).length; const ico = { physics: '⚛️', chemistry: '🧪', maths: '📐' }[s.id]; return `<a class="card link subject-card" data-s="${s.id}" href="#/subject/${s.id}">
      <div class="row" style="align-items:center"><span class="sub-ico ${s.id}">${ico}</span><span style="flex:1"><b style="font-size:1.1rem">${s.name}</b><div class="muted">${ch.length} chapters · ${tot} questions · ${done} done</div></span><span class="go" style="color:var(--primary);font-weight:700">Open →</span></div>
      <div class="progress" style="margin-top:8px"><span style="width:${Math.min(100, 100 * done / Math.max(1, tot))}%"></span></div>
    </a>`; }).join('')}

    <h2>More tools</h2>
    <div class="grid two">
      <a class="card link" href="#/pyq"><b>📚 Past papers</b><div class="muted">KCET 2009 to 2026, timed, with answers.</div></a>
      <a class="card link" href="#/tests"><b>📝 Mock tests</b><div class="muted">Full 60-question papers, exam pattern.</div></a>
      <a class="card link" href="#/speed"><b>⏱ Speed training</b><div class="muted">60-second drills. Learn to skip and return.</div></a>
      <a class="card link" href="#/rank"><b>🎯 Rank calculator</b><div class="muted">Board marks + CET marks → rank estimate.</div></a>
      <a class="card link" href="#/plan"><b>📆 My study plan</b><div class="muted">${plan ? `${daysLeft} days left · edit plan` : 'Day-by-day schedule to your exam.'}</div></a>
      <a class="card link" href="#/progress"><b>📈 Progress & mistakes</b><div class="muted">Weak chapters and why you go wrong.</div></a>
      <a class="card link" href="#/examday"><b>🎒 Last 7 days & exam day</b><div class="muted">Final-week plan, what to carry, hall strategy.</div></a>
      <a class="card link" href="#/report"><b>🗂 Weekly report card</b><div class="muted">This week's score, shareable as an image.</div></a>
    </div>

    <div class="card">
      <b>Remember</b>
      <ul class="muted" style="padding-left:1.2rem;margin:6px 0 0">
        <li>60 questions per subject, 80 minutes, 1 mark each. <b>No negative marking</b> — answer everything.</li>
        <li>Rank = 50% board PCM marks + 50% CET marks. The board exam matters just as much.</li>
      </ul>
    </div>
    <p class="muted" style="text-align:center">Free · non-profit · no ads · not affiliated with KEA · <a href="${FEEDBACK}" target="_blank" rel="noopener">Report a mistake</a> · <a href="#/settings">About & settings</a></p>
  </div>`);

  node.querySelector('#installNow')?.addEventListener('click', async () => { const p = window.__installPrompt; if (!p) return; p.prompt(); const { outcome } = await p.userChoice; if (outcome === 'accepted') { toast('Installed! Open it from your home screen.'); node.querySelector('#installBanner')?.remove(); } });
  node.querySelector('#installLater')?.addEventListener('click', () => { localStorage.setItem('kcet.installDismissed', String(Date.now())); node.querySelector('#installBanner')?.remove(); });
  window.addEventListener('kcet:installable', () => { const b = node.querySelector('#installBanner'); if (b) { b.querySelector('#installNow')?.classList.remove('hidden'); b.querySelector('.install-how')?.classList.add('hidden'); } }, { once: true });
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

function installBanner() {
  const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const dismissed = +localStorage.getItem('kcet.installDismissed') || 0;
  if (standalone || Date.now() - dismissed < 7 * 86400000) return '';
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const canPrompt = !!window.__installPrompt;
  const how = isIOS ? 'Tap the <b>Share</b> button (square with arrow) → <b>Add to Home Screen</b>.'
    : isAndroid ? 'Tap the browser <b>⋮ menu</b> → <b>Add to Home screen</b> / <b>Install app</b>.'
    : 'In Chrome or Edge: click the <b>install icon</b> in the address bar, or menu → <b>Install KCET Prep</b>.';
  return `<div class="card install-banner" id="installBanner">
    <div class="row spread" style="align-items:center;gap:10px">
      <span><b>📲 Install the app</b><div class="muted">Opens full-screen, works offline, no store needed.</div><div class="muted install-how ${canPrompt ? 'hidden' : ''}" style="margin-top:4px">${how}</div></span>
      <span class="row" style="gap:6px"><button class="btn small ${canPrompt ? '' : 'hidden'}" id="installNow">Install</button><button class="btn small ghost" id="installLater">Later</button></span>
    </div></div>`;
}
