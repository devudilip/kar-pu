import { store } from '../store.js';
import { el, toast } from '../ui.js';
import { buildPlan } from './plan.js';

// First-launch tour: 3 slides, ends by building the study plan. Re-openable from Settings.
export function showTour() {
  const slides = [
    { emoji: '👋', title: 'Welcome to KCET Prep', text: 'Free practice for Karnataka CET, made by Sirigannada. Everything here works on your phone, even offline.' },
    { emoji: '🗺️', title: 'Three things, every day', text: '<b>1.</b> Daily 10 quick questions.<br><b>2.</b> Learn one chapter: short notes, then 40 questions with explanations.<br><b>3.</b> Revise flashcards or take a timed test.<br>The home page always shows what to do next.' },
    { emoji: '📅', title: 'When is your exam?', text: 'We will build a day-by-day plan around your date and your weak chapters. You can change it any time.', form: true }
  ];
  let i = 0;
  const box = el(`<div class="loader" id="tour" style="background:rgba(42,26,22,.55)"><div class="loader-box tour-box" style="text-align:left;width:min(420px,100%)"></div></div>`);
  document.body.appendChild(box);
  const render = () => {
    const s = slides[i];
    box.querySelector('.tour-box').innerHTML = `
      <div style="font-size:2.4rem;text-align:center">${s.emoji}</div>
      <h2 style="text-align:center;margin:6px 0">${s.title}</h2>
      <p class="muted" style="text-align:center">${s.text}</p>
      ${s.form ? `<div class="stack" style="margin:10px 0">
        <label class="field">KCET exam date <input type="date" id="tDate" value="${defaultExam()}"></label>
        <label class="field">Study time per day <select id="tHours"><option value="2">2 hours</option><option value="3" selected>3 hours</option><option value="4">4 hours</option><option value="6">6 hours</option></select></label>
      </div>` : ''}
      <div style="text-align:center;margin:8px 0">${slides.map((_, k) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 3px;background:${k === i ? 'var(--primary)' : '#e6d6cf'}"></span>`).join('')}</div>
      <div class="row spread">
        <button class="btn ghost" id="tSkip">${s.form ? 'Skip for now' : 'Skip'}</button>
        <button class="btn" id="tNext">${s.form ? 'Build my plan →' : 'Next →'}</button>
      </div>`;
    box.querySelector('#tSkip').addEventListener('click', finish);
    box.querySelector('#tNext').addEventListener('click', async () => {
      if (!s.form) { i++; render(); return; }
      const date = box.querySelector('#tDate').value, hours = +box.querySelector('#tHours').value;
      if (!date || new Date(date) <= new Date()) return alert('Please pick a future exam date');
      const b = box.querySelector('#tNext'); b.disabled = true; b.textContent = 'Building…';
      store.setPlan(await buildPlan(date, hours));
      toast('Your plan is ready. Start with Daily 10!');
      finish();
    });
  };
  function finish() { store.setSetting('onboarded', true); box.remove(); if (location.hash === '' || location.hash === '#/') location.reload(); }
  render();
}
function defaultExam() { const d = new Date(); d.setMonth(d.getMonth() + 4); return d.toISOString().slice(0, 10); }
