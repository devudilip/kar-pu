import { SUBJECTS, syllabus, flashcards, chapter, shuffle } from '../data.js';
import { store } from '../store.js';
import { el, esc, math, LETTERS } from '../ui.js';

// #/flashcards                -> pick subject/chapter
// #/flashcards/<subject>/<slug|all|due>  -> deck (add ?mode=questions to use question bank as cards)
export default async function flashcardsView([subject, slug], query) {
  const syl = await syllabus();
  if (!subject) return picker(syl);
  const s = SUBJECTS.find((x) => x.id === subject);
  const fc = await flashcards(subject);
  let cards = [];
  if (query.mode === 'questions') {
    const chapters = slug === 'all' ? syl[subject].filter((c) => c.count) : [syl[subject].find((c) => c.slug === slug)];
    for (const c of chapters) { const ch = await chapter(subject, c.slug); ch.questions.forEach((q) => cards.push({ key: 'q:' + q.id, f: q.q, b: `<b>${LETTERS[q.answer]}. ${q.options[q.answer]}</b><div class="muted">${q.explanation || ''}</div>`, chapter: c.title })); }
  } else {
    for (const c of fc.chapters) {
      if (slug !== 'all' && slug !== 'due' && c.slug !== slug) continue;
      const meta = syl[subject].find((x) => x.slug === c.slug);
      c.cards.forEach((k, i) => cards.push({ key: `${subject}/${c.slug}/${i}`, f: k.f, b: k.b, chapter: meta?.title || c.slug }));
    }
  }
  if (slug === 'due') cards = cards.filter((c) => store.card(c.key).next <= Date.now());
  cards = shuffle(cards);
  const title = slug === 'all' ? `${s.name} — all chapters` : slug === 'due' ? `${s.name} — due for review` : (syl[subject].find((c) => c.slug === slug)?.title || slug);

  const node = el(`<div>
    <div class="breadcrumb"><a href="#/flashcards">Flashcards</a> › ${s.name}</div>
    <div class="row spread"><h1 style="font-size:1.2rem">${esc(title)}</h1><span class="pill" id="count"></span></div>
    <div id="deck"></div>
  </div>`);
  const deck = node.querySelector('#deck');
  let i = 0, got = 0;
  const render = () => {
    node.querySelector('#count').textContent = `${Math.min(i + 1, cards.length)} / ${cards.length}`;
    if (!cards.length) { deck.innerHTML = `<div class="card empty">${slug === 'due' ? 'Nothing due for review. Come back tomorrow, or study a chapter deck.' : 'No flashcards for this chapter yet.'}<br><a href="#/flashcards">Back</a></div>`; return; }
    if (i >= cards.length) { deck.innerHTML = `<div class="card" style="text-align:center"><h2>Deck complete</h2><div class="score-big">${got}/${cards.length}</div><p class="muted">Cards you marked "Again" come back tomorrow; "Got it" cards return after 1, 3, 7, 14, 30 days.</p><div class="row" style="justify-content:center"><button class="btn" id="again">Go through again</button><a class="btn secondary" href="#/flashcards">Other decks</a></div></div>`; deck.querySelector('#again').addEventListener('click', () => { cards = shuffle(cards); i = 0; got = 0; render(); }); return; }
    const c = cards[i]; const st = store.card(c.key);
    deck.innerHTML = `<div class="card flash" id="card" style="min-height:220px;cursor:pointer;display:flex;flex-direction:column;justify-content:center;text-align:center">
        <div class="muted" style="font-size:.8rem">${esc(c.chapter)} · level ${st.lvl}</div>
        <div class="front" style="font-size:1.15rem;margin:16px 0">${c.f}</div>
        <div class="back hidden" style="border-top:1px dashed var(--border);padding-top:12px;font-size:1.05rem">${c.b}</div>
        <div class="muted hint" style="font-size:.8rem">Tap to reveal</div>
      </div>
      <div class="row hidden" id="rate" style="justify-content:center;gap:12px">
        <button class="btn danger" id="no">Again</button>
        <button class="btn" id="yes" style="background:var(--ok)">Got it</button>
      </div>`;
    math(deck);
    const card = deck.querySelector('#card');
    card.addEventListener('click', () => { card.querySelector('.back').classList.remove('hidden'); card.querySelector('.hint').classList.add('hidden'); deck.querySelector('#rate').classList.remove('hidden'); });
    deck.querySelector('#yes').addEventListener('click', () => { store.rateCard(c.key, true); got++; i++; render(); });
    deck.querySelector('#no').addEventListener('click', () => { store.rateCard(c.key, false); i++; render(); });
  };
  render();
  return node;
}

async function picker(syl) {
  const decks = await Promise.all(SUBJECTS.map(async (s) => ({ s, fc: await flashcards(s.id) })));
  const node = el(`<div>
    <h1>Flashcards</h1>
    <p class="muted">Formula and fact cards for one-minute recall. Tap a card to flip, then mark it. Cards you miss come back sooner (spaced repetition).</p>
    ${decks.map(({ s, fc }) => {
      const total = fc.chapters.reduce((a, c) => a + c.cards.length, 0);
      let due = 0; fc.chapters.forEach((c) => c.cards.forEach((_, i) => { if (store.card(`${s.id}/${c.slug}/${i}`).next <= Date.now() && store.card(`${s.id}/${c.slug}/${i}`).lvl > 0) due++; }));
      return `<div class="card subject-card" data-s="${s.id}">
        <div class="row spread"><h2 style="margin:0">${s.name}</h2><span class="pill">${total} cards</span></div>
        <div class="row" style="margin:8px 0">
          <a class="btn small" href="#/flashcards/${s.id}/due">Due for review (${due})</a>
          <a class="btn small secondary" href="#/flashcards/${s.id}/all">All formula cards</a>
          <a class="btn small ghost" href="#/flashcards/${s.id}/all?mode=questions">Question cards</a>
        </div>
        <details><summary class="muted">By chapter</summary><div class="stack" style="margin-top:8px">${syl[s.id].map((c) => { const has = fc.chapters.find((x) => x.slug === c.slug); return `<div class="row spread"><span>${esc(c.title)}</span><span>${has ? `<a class="btn small ghost" href="#/flashcards/${s.id}/${c.slug}">${has.cards.length} cards</a>` : ''}${c.count ? ` <a class="btn small ghost" href="#/flashcards/${s.id}/${c.slug}?mode=questions">Qs</a>` : ''}</span></div>`; }).join('')}</div></details>
      </div>`; }).join('')}
  </div>`);
  return node;
}
