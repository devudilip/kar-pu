import { store } from '../store.js';
import { el, esc } from '../ui.js';

const CK = 'kcet.examday';
function loadChecks() { try { return JSON.parse(localStorage.getItem(CK)) || {}; } catch { return {}; } }
function saveChecks(obj) { try { localStorage.setItem(CK, JSON.stringify(obj)); } catch (e) { console.warn('save failed', e); } }

const CHECKLIST = [
  ['ticket', 'Admission ticket printed'],
  ['photoid', 'Original photo ID (Aadhaar, etc.)'],
  ['pens', 'Blue or black ballpoint pens (2)'],
  ['early', 'Reach the exam centre 1 hour early'],
  ['centre', 'Know your centre location — visit or check the day before'],
  ['noitems', 'No phone, calculator, watch or notes inside the hall'],
  ['water', 'Water bottle if allowed (must be transparent)'],
  ['food', 'Eat something light before the exam']
];

function daysLeft(examDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(examDate + 'T00:00:00');
  return Math.round((end - today) / 86400000);
}

function dayCard(n, tasks) {
  return `<div class="card">
    <div class="row spread"><b>${n === 1 ? 'Day 1 (last day)' : 'Day ' + n}</b></div>
    <ul style="padding-left:1.1rem;margin:.4rem 0">${tasks.map((t) => `<li style="margin:.25rem 0">${t}</li>`).join('')}</ul>
  </div>`;
}

export default async function examday() {
  const plan = store.plan();
  const examDate = plan?.examDate;

  const headerCard = examDate
    ? (() => {
        const d = daysLeft(examDate);
        return `<div class="card">
          <div class="kicker">Countdown</div>
          <h1 style="margin:.2rem 0">${d > 0 ? `${d} day${d === 1 ? '' : 's'} left` : d === 0 ? 'Exam is today!' : 'Exam day has passed'}</h1>
          <p class="muted">KCET exam date: ${esc(examDate)}</p>
        </div>`;
      })()
    : `<div class="card">
        <div class="kicker">Countdown</div>
        <h1 style="margin:.2rem 0">When is your exam?</h1>
        <p class="muted">Set your exam date to see the days-left countdown and your last-7-days plan.</p>
        <a class="btn" href="#/plan">Set your exam date</a>
      </div>`;

  const days = [
    { n: 7, tasks: [
      'Solve one full <a href="#/pyq">previous year paper</a> at the real exam time (timed).',
      'In the evening, go through your <a href="#/progress">mistakes</a> from today\'s paper.',
      'No new chapters this week — only revise what you already studied.'
    ] },
    { n: 6, tasks: [
      'One timed <a href="#/pyq">previous year paper</a> at exam time.',
      'Review <a href="#/progress">mistakes</a> the same day — do not leave them for later.',
      'Clear <a href="#/flashcards">flashcards due</a> before you sleep.'
    ] },
    { n: 5, tasks: [
      'One timed <a href="#/pyq">previous year paper</a> at exam time.',
      'Fix mistakes in <a href="#/progress">progress → mistakes</a>.',
      'Do a quick <a href="#/speed">speed drill</a> on calculation-heavy topics.'
    ] },
    { n: 4, tasks: [
      'One <a href="#/tests">full mock test</a> at the real exam time (80 minutes).',
      'Review every wrong answer in <a href="#/progress">mistakes</a> right after.',
      'Revise your <a href="#/progress">weak chapters</a> for 30–40 minutes.'
    ] },
    { n: 3, tasks: [
      'One timed <a href="#/pyq">previous year paper</a> at exam time.',
      'Review <a href="#/progress">mistakes</a> the same day.',
      'Go through <a href="#/flashcards">flashcards due</a> for formulas and facts.'
    ] },
    { n: 2, tasks: [
      'One last timed <a href="#/pyq">previous year paper</a> or short <a href="#/tests">mock</a> at exam time.',
      'Review <a href="#/progress">mistakes</a> — keep it light, don\'t stress.',
      'Sleep 7+ hours tonight — your brain needs rest to remember what you studied.'
    ] },
    { n: 1, tasks: [
      'Light day only — no new papers, no new chapters.',
      'Go through <a href="#/flashcards">flashcards due</a> and formula sheets.',
      'Pack your bag (see checklist below) and sleep 7+ hours.'
    ] }
  ];

  const checks = loadChecks();
  const node = el(`<div>
    ${headerCard}

    <h2>Last 7 days plan</h2>
    <p class="muted">Simple rule: no new chapters this week. Just practise, fix mistakes, and rest well.</p>
    ${days.map((d) => dayCard(d.n, d.tasks)).join('')}

    <h2>Exam day checklist</h2>
    <div class="card">
      <div class="checks stack" id="checklist">
        ${CHECKLIST.map(([id, label]) => `<label class="row"><input type="checkbox" data-id="${id}" ${checks[id] ? 'checked' : ''}> <span>${esc(label)}</span></label>`).join('')}
      </div>
      <button class="btn ghost" id="resetCheck" style="margin-top:10px">Reset checklist</button>
    </div>

    <h2>In the hall — strategy</h2>
    <div class="card">
      <p><b>60 questions in 80 minutes.</b> Split your time like this:</p>
      <ul style="padding-left:1.1rem">
        <li><b>First pass (40 min):</b> Answer every question you know. Skip hard ones — don't get stuck.</li>
        <li><b>Second pass (30 min):</b> Go back to skipped questions. Try the ones you can now solve.</li>
        <li><b>Last 10 min:</b> Fill every remaining bubble with your best guess. There is <b>no negative marking</b> — an unanswered question and a wrong answer score the same, so never leave a blank.</li>
      </ul>
      <p><b>OMR sheet:</b> darken the bubble fully, only one bubble per question, and do not fold the sheet.</p>
      <p>If Chemistry or Biology theory is faster for you, do that section first to bank easy marks.</p>
      <p class="muted">If a question looks strange or wrong, stay calm and move on — KEA gives grace marks for such questions, so it won't hurt your score.</p>
    </div>
  </div>`);

  node.querySelector('#checklist').addEventListener('change', (e) => {
    const input = e.target.closest('input[data-id]');
    if (!input) return;
    const cur = loadChecks();
    if (input.checked) cur[input.dataset.id] = true; else delete cur[input.dataset.id];
    saveChecks(cur);
  });
  node.querySelector('#resetCheck').addEventListener('click', () => {
    saveChecks({});
    node.querySelectorAll('#checklist input[type=checkbox]').forEach((c) => { c.checked = false; });
  });

  return node;
}
