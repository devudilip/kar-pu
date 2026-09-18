import { SUBJECTS, PFX, syllabus } from '../data.js';
import { store } from '../store.js';
import { el, esc, toast, fmtDate } from '../ui.js';

// Weekly report card: last 7 days. Shareable as a PNG image.
export function weekStats() {
  const st = store.get();
  const since = Date.now() - 7 * 86400000;
  const bySub = Object.fromEntries(SUBJECTS.map((s) => [s.id, { n: 0, c: 0 }]));
  const wrongByCh = {};
  let n = 0, c = 0;
  for (const [id, a] of Object.entries(st.attempts)) {
    if (!a.t || a.t < since) continue;
    const m = /^(phy|che|mat)-(.+)-\d{3}$/.exec(id); if (!m) continue;
    const sub = { phy: 'physics', che: 'chemistry', mat: 'maths' }[m[1]];
    n++; bySub[sub].n++; if (a.last) { c++; bySub[sub].c++; } else wrongByCh[sub + '/' + m[2]] = (wrongByCh[sub + '/' + m[2]] || 0) + 1;
  }
  const tests = st.tests.filter((t) => t.date >= since);
  const timed = tests.filter((t) => t.total);
  const secPerQ = timed.length ? Math.round(timed.reduce((a, t) => a + t.timeTaken, 0) / timed.reduce((a, t) => a + t.total, 0)) : null;
  const bestTest = tests.slice().sort((a, b) => b.correct / b.total - a.correct / a.total)[0];
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); return !!st.daily[k]; });
  const weak = Object.entries(wrongByCh).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return { n, c, bySub, tests: tests.length, secPerQ, bestTest, streak: store.streak(), activeDays: days.filter(Boolean).length, days, weak };
}

export default async function report() {
  const syl = await syllabus();
  store.setSetting('reportSeen', store.today());
  const w = weekStats();
  const title = (k) => { const [s, slug] = k.split('/'); return syl[s]?.find((c) => c.slug === slug)?.title || slug; };
  const acc = w.n ? Math.round(100 * w.c / w.n) : 0;
  const grade = !w.n ? '—' : acc >= 80 ? 'A' : acc >= 65 ? 'B' : acc >= 50 ? 'C' : 'D';
  const advice = !w.n ? 'No practice recorded this week. Start with Daily 10 today.' : acc >= 80 ? 'Strong week. Push speed: try 45-second drills.' : acc >= 65 ? 'Good. Re-do the mistakes from your weakest chapter before moving on.' : acc >= 50 ? 'Accuracy is the priority. Read notes, then practise slowly; speed comes later.' : 'Go back to basics: notes + flashcards for the three chapters below, then re-attempt.';
  const node = el(`<div>
    <div class="row spread"><h1>Weekly report</h1><span class="muted">${fmtDate(Date.now() - 6 * 86400000)} – ${fmtDate(Date.now())}</span></div>
    <div class="card" id="cardBox" style="border-top:6px solid var(--accent)">
      <div class="row spread" style="align-items:center"><div><div class="kicker">This week</div><div class="score-big">${grade}</div></div>
        <div class="grid three" style="flex:1;margin-left:12px"><div class="stat"><b>${w.n}</b><span class="muted">questions</span></div><div class="stat"><b>${acc}%</b><span class="muted">correct</span></div><div class="stat"><b>${w.secPerQ ?? '—'}${w.secPerQ ? 's' : ''}</b><span class="muted">per Q in tests</span></div></div></div>
      <div class="row" style="gap:6px;margin:10px 0">${w.days.map((on, i) => `<span style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:.7rem;font-weight:700;background:${on ? 'var(--ok)' : '#efe0d8'};color:${on ? '#fff' : 'var(--muted)'}">${'SMTWTFS'[(new Date().getDay() - 6 + i + 7) % 7]}</span>`).join('')}<span class="muted" style="margin-left:6px">${w.activeDays}/7 days · 🔥 ${w.streak}-day streak</span></div>
      <h3 style="margin:8px 0 4px">By subject</h3>
      ${SUBJECTS.map((s) => { const b = w.bySub[s.id]; const p = b.n ? Math.round(100 * b.c / b.n) : 0; return `<div class="row spread" style="margin:4px 0"><span>${s.name}</span><span class="muted">${b.c}/${b.n}</span></div><div class="progress"><span style="width:${p}%;background:var(--${s.id === 'physics' ? 'phy' : s.id === 'chemistry' ? 'chem' : 'math'})"></span></div>`; }).join('')}
      <h3 style="margin:12px 0 4px">Fix these next week</h3>
      ${w.weak.length ? w.weak.map(([k, v]) => { const [s, slug] = k.split('/'); return `<div class="row spread"><a href="#/chapter/${s}/${slug}?tab=practice">${esc(title(k))}</a><span class="pill bad">${v} wrong</span></div>`; }).join('') : '<div class="muted">No wrong answers recorded this week.</div>'}
      ${w.bestTest ? `<p class="muted" style="margin-top:10px">Best test: ${esc(w.bestTest.title)} — ${w.bestTest.correct}/${w.bestTest.total}</p>` : ''}
      <div class="explain" style="margin-top:10px"><b>Coach says:</b> ${advice}</div>
    </div>
    <div class="row"><button class="btn" id="share">Share as image</button><button class="btn secondary" id="save">Save image</button><a class="btn ghost" href="#/progress">Full progress</a></div>
    <p class="muted">Share it with a parent or teacher. A new card is ready every Sunday.</p>
  </div>`);
  const draw = () => drawCard({ grade, acc, n: w.n, secPerQ: w.secPerQ, streak: w.streak, activeDays: w.activeDays, bySub: w.bySub, weak: w.weak.map(([k, v]) => [title(k), v]), advice });
  node.querySelector('#save').addEventListener('click', async () => { const blob = await draw(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kcet-weekly-report.png'; a.click(); });
  node.querySelector('#share').addEventListener('click', async () => {
    const blob = await draw(); const file = new File([blob], 'kcet-weekly-report.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'My KCET weekly report', text: 'My KCET Prep weekly report card' }); } catch {} }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kcet-weekly-report.png'; a.click(); toast('Image saved — share it from your gallery'); }
  });
  return node;
}

async function drawCard(d) {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  x.fillStyle = '#fbf1ec'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#fffdf8'; roundRect(x, 60, 60, W - 120, H - 120, 40); x.fill();
  x.fillStyle = '#d9a441'; x.fillRect(60, 60, W - 120, 14);
  x.fillStyle = '#b8301c'; x.font = 'bold 34px Archivo, Anek Kannada, sans-serif'; x.fillText('KCET PREP · WEEKLY REPORT', 110, 150);
  x.fillStyle = '#6f534b'; x.font = '30px Archivo, sans-serif'; x.fillText(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), 110, 195);
  x.fillStyle = '#2a1a16'; x.font = 'bold 220px Georgia, serif'; x.fillText(d.grade, 110, 430);
  x.font = 'bold 44px Archivo, sans-serif'; x.fillText(`${d.n} questions`, 420, 300); x.fillText(`${d.acc}% correct`, 420, 360);
  x.fillText(d.secPerQ ? `${d.secPerQ} s per question` : 'No timed test yet', 420, 420);
  x.fillStyle = '#b8301c'; x.font = 'bold 40px Archivo, sans-serif'; x.fillText(`🔥 ${d.streak}-day streak · ${d.activeDays}/7 days active`, 110, 520);
  let y = 610; x.fillStyle = '#2a1a16'; x.font = 'bold 38px Archivo, sans-serif'; x.fillText('By subject', 110, y); y += 30;
  const cols = { physics: '#b8301c', chemistry: '#2f7d4f', maths: '#7a4b8f' };
  for (const s of ['physics', 'chemistry', 'maths']) { const b = d.bySub[s]; const p = b.n ? b.c / b.n : 0; y += 60; x.fillStyle = '#2a1a16'; x.font = '34px Archivo, sans-serif'; x.fillText(s[0].toUpperCase() + s.slice(1), 110, y); x.fillText(`${b.c}/${b.n}`, 860, y); x.fillStyle = '#efe0d8'; roundRect(x, 110, y + 14, 860, 18, 9); x.fill(); x.fillStyle = cols[s]; roundRect(x, 110, y + 14, Math.max(18, 860 * p), 18, 9); x.fill(); y += 20; }
  y += 80; x.fillStyle = '#2a1a16'; x.font = 'bold 38px Archivo, sans-serif'; x.fillText('Fix next week', 110, y);
  x.font = '34px Archivo, sans-serif'; if (!d.weak.length) { y += 55; x.fillStyle = '#6f534b'; x.fillText('No wrong answers recorded', 110, y); }
  for (const [t, v] of d.weak) { y += 55; x.fillStyle = '#2a1a16'; x.fillText(`• ${t}`.slice(0, 44), 110, y); x.fillStyle = '#b8301c'; x.fillText(`${v} wrong`, 860, y); }
  y += 90; x.fillStyle = '#f6ece6'; roundRect(x, 110, y - 40, 860, 150, 20); x.fill(); x.fillStyle = '#2a1a16'; x.font = 'bold 30px Archivo, sans-serif'; x.fillText('Coach says:', 135, y);
  x.font = '28px Archivo, sans-serif'; wrap(x, d.advice, 135, y + 42, 810, 36);
  x.fillStyle = '#6f534b'; x.font = '26px Archivo, sans-serif'; x.fillText('pu.sirigannada.in · free KCET practice', 110, H - 100);
  return new Promise((res) => cv.toBlob(res, 'image/png'));
}
function roundRect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function wrap(x, text, X, Y, maxW, lh) { const words = text.split(' '); let line = '', y = Y; for (const w of words) { const t = line + w + ' '; if (x.measureText(t).width > maxW && line) { x.fillText(line, X, y); line = w + ' '; y += lh; } else line = t; } x.fillText(line, X, y); }
