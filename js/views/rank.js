import { rankData } from '../data.js';
import { store } from '../store.js';
import { el, esc } from '../ui.js';

export default async function rank() {
  const data = await rankData();
  const st = store.get();
  const lastMock = st.tests.find((t) => t.cfg?.weighted);
  const node = el(`<div>
    <h1>Rank calculator</h1>
    <div class="card">
      <p class="muted">KCET engineering rank uses <b>50% of your 2nd PUC PCM percentage + 50% of your KCET PCM percentage</b>. Board marks count as much as the entrance test. This estimate is approximate — use it to set targets, not to predict seats.</p>
      <div class="stack">
        <label class="field">2nd PUC marks in Physics + Chemistry + Maths (out of 300) <input type="number" id="board" min="0" max="300" placeholder="e.g. 255"></label>
        <label class="field">KCET marks in PCM (out of 180) <input type="number" id="cet" min="0" max="180" placeholder="e.g. 120" value="${lastMock ? Math.round(lastMock.correct * 3) : ''}"></label>
        ${lastMock ? `<div class="muted">Prefilled from your last full mock (${lastMock.correct}/60 → scaled to 3 subjects).</div>` : ''}
        <button class="btn block" id="calc">Estimate my rank</button>
      </div>
      <div id="res" style="margin-top:12px"></div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Target a college</h3>
      <p class="muted">Approximate General Merit closing ranks for CSE from recent rounds. Other branches close at higher ranks. Verify on the KEA cutoff PDF.</p>
      <table class="table"><thead><tr><th>College</th><th>CSE rank ≈</th><th>Needs</th></tr></thead><tbody id="colleges">${data.colleges.map((c) => `<tr><td>${esc(c.name)}</td><td>${c.cse.toLocaleString('en-IN')}</td><td class="need" data-r="${c.cse}">—</td></tr>`).join('')}</tbody></table>
    </div>
    <p class="muted">${esc(data.note)}</p>
  </div>`);
  const bandFor = (score) => data.bands.find((b) => score >= b.min);
  const scoreForRank = (r) => { const b = [...data.bands].reverse().find((x) => x.rank <= r) || data.bands[0]; return b.min; };
  node.querySelector('#calc').addEventListener('click', () => {
    const board = +node.querySelector('#board').value, cet = +node.querySelector('#cet').value;
    if (!board || !cet) return alert('Enter both marks');
    const bp = 100 * board / 300, cp = 100 * cet / 180, comp = 0.5 * bp + 0.5 * cp;
    const band = bandFor(comp);
    node.querySelector('#res').innerHTML = `<div class="explain"><div>Board ${bp.toFixed(1)}% · CET ${cp.toFixed(1)}% → <b>composite ${comp.toFixed(1)}%</b></div><div class="score-big" style="font-size:1.8rem">Rank ≈ ${band.rank.toLocaleString('en-IN')} or better</div>
      <div class="muted">Every extra 6 marks in KCET (≈3.3%) lifts your composite by about 1.7%. Every extra 10 board marks in PCM lifts it by about 1.7% too — do not neglect the board exam.</div></div>`;
    node.querySelectorAll('.need').forEach((td) => {
      const need = scoreForRank(+td.dataset.r);
      const cetNeeded = Math.ceil(((2 * need - bp) / 100) * 180);
      td.innerHTML = cetNeeded <= cet ? '<span class="pill ok">on track</span>' : cetNeeded > 180 ? '<span class="pill bad">raise board marks</span>' : `<span class="pill warn">${cetNeeded}/180 in CET</span>`;
    });
  });
  return node;
}
