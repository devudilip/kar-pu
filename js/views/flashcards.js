import { SUBJECTS, syllabus, flashcards, chapter, shuffle } from '../data.js';
import { store } from '../store.js';
import { el, esc, math, LETTERS, toast } from '../ui.js';

// #/flashcards                             -> picker
// #/flashcards/<subject>/<slug|all|due>    -> deck (?mode=questions uses the question bank)
export default async function flashcardsView([subject, slug], query) {
  const syl = await syllabus();
  if (!subject) return picker(syl);
  const s = SUBJECTS.find((x) => x.id === subject);
  const fc = await flashcards(subject);
  let cards = [];
  if (query.mode === 'questions') {
    const chapters = slug === 'all' ? syl[subject].filter((c) => c.count) : [syl[subject].find((c) => c.slug === slug)];
    for (const c of chapters) { const ch = await chapter(subject, c.slug); ch.questions.forEach((q) => cards.push({ key: 'q:' + q.id, f: q.q, b: `<b>${LETTERS[q.answer]}. ${q.options[q.answer]}</b><div class="muted" style="margin-top:6px">${q.explanation || ''}</div>`, chapter: c.title })); }
  } else {
    for (const c of fc.chapters) {
      if (slug !== 'all' && slug !== 'due' && c.slug !== slug) continue;
      const meta = syl[subject].find((x) => x.slug === c.slug);
      c.cards.forEach((k, i) => cards.push({ key: `${subject}/${c.slug}/${i}`, f: k.f, b: k.b, chapter: meta?.title || c.slug }));
    }
  }
  if (slug === 'due') cards = cards.filter((c) => store.card(c.key).next <= Date.now());
  if (slug === 'all' && query.mode !== 'questions') cards = cards.slice(0); // full deck
  cards = shuffle(cards);
  const title = slug === 'all' ? `${s.name} · all cards` : slug === 'due' ? `${s.name} · due today` : (syl[subject].find((c) => c.slug === slug)?.title || slug);

  const node = el(`<div>
    <div class="breadcrumb"><a href="#/flashcards">Flashcards</a> › ${s.name}</div>
    <div class="row spread" style="align-items:center"><h1 style="font-size:1.2rem;margin:4px 0">${esc(title)}</h1><span class="pill" id="count"></span></div>
    <div class="progress" style="margin:6px 0 12px"><span id="pb" style="width:0%"></span></div>
    <div id="deck"></div>
  </div>`);
  const deck = node.querySelector('#deck');
  let i = 0, got = 0;
  const render = () => {
    node.querySelector('#count').textContent = `${Math.min(i + 1, cards.length)} / ${cards.length}`;
    node.querySelector('#pb').style.width = (cards.length ? 100 * i / cards.length : 0) + '%';
    if (!cards.length) { deck.innerHTML = `<div class="card empty">${slug === 'due' ? 'Nothing due today. Study a chapter deck, and cards you miss will come back here.' : 'No flashcards for this chapter yet.'}<br><br><a class="btn" href="#/flashcards">Back to decks</a></div>`; return; }
    if (i >= cards.length) {
      const pct = Math.round(100 * got / cards.length);
      deck.innerHTML = `<div class="card" style="text-align:center"><div style="font-size:2.4rem">${pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div><h2>Deck done</h2><div class="score-big">${got}/${cards.length}</div>
        <p class="muted">${pct >= 80 ? 'Excellent recall.' : 'The ones you missed will come back tomorrow.'} Cards you know return after 1, 3, 7, 14 and 30 days.</p>
        <div class="row" style="justify-content:center"><button class="btn" id="again">Go again</button><a class="btn secondary" href="#/flashcards">Other decks</a></div></div>`;
      deck.querySelector('#again').addEventListener('click', () => { cards = shuffle(cards); i = 0; got = 0; render(); });
      store.setLast({ type: 'cards', href: '#/flashcards', title: 'Flashcards', sub: 'Pick a deck' });
      return;
    }
    const c = cards[i]; const st = store.card(c.key);
    store.setLast({ type: 'cards', href: location.hash, title, sub: `Flashcards · card ${i + 1} of ${cards.length}` });
    deck.innerHTML = `
      <div class="flashcard" id="card">
        <div class="fc-face fc-front">
          <div class="fc-meta">${esc(c.chapter)}${st.lvl ? ` · seen ${st.lvl}×` : ' · new'}</div>
          <div class="fc-text">${c.f}</div>
          <button class="btn cta" id="reveal">Show answer</button>
        </div>
        <div class="fc-face fc-back hidden">
          <div class="fc-meta">Answer</div>
          <div class="fc-q muted">${c.f}</div>
          <div class="fc-text">${c.b}</div>
          <div class="fc-ask">Did you remember it?</div>
          <div class="row" style="gap:10px">
            <button class="btn danger" id="no" style="flex:1">😕 No, show again soon</button>
            <button class="btn" id="yes" style="flex:1;background:var(--ok)">✅ Yes, I knew it</button>
          </div>
        </div>
      </div>`;
    math(deck);
    const show = () => { deck.querySelector('.fc-front').classList.add('hidden'); deck.querySelector('.fc-back').classList.remove('hidden'); window.scrollTo(0, 0); };
    deck.querySelector('#reveal').addEventListener('click', show);
    deck.querySelector('.fc-front .fc-text').addEventListener('click', show);
    deck.querySelector('#yes').addEventListener('click', () => { store.rateCard(c.key, true); got++; i++; render(); });
    deck.querySelector('#no').addEventListener('click', () => { store.rateCard(c.key, false); i++; render(); });
  };
  render();
  return node;
}

async function picker(syl) {
  const decks = await Promise.all(SUBJECTS.map(async (s) => ({ s, fc: await flashcards(s.id) })));
  let totalDue = 0;
  const rows = decks.map(({ s, fc }) => {
    const total = fc.chapters.reduce((a, c) => a + c.cards.length, 0);
    let due = 0, seen = 0; fc.chapters.forEach((c) => c.cards.forEach((_, i) => { const k = store.card(`${s.id}/${c.slug}/${i}`); if (k.lvl > 0) { seen++; if (k.next <= Date.now()) due++; } }));
    totalDue += due; return { s, fc, total, due, seen };
  });
  const ico = { physics: '⚛️', chemistry: '🧪', maths: '📐' };
  const node = el(`<div>
    <h1>Flashcards</h1>
    <p class="muted">One formula or fact per card. Read the front, tap <b>Show answer</b>, then say honestly if you knew it. Cards you miss come back sooner. 5 minutes a day is enough.</p>
    ${totalDue ? `<div class="card" style="border-color:var(--primary);background:#fbe9e4"><div class="row spread" style="align-items:center"><span><b style="font-size:1.1rem">${totalDue} cards due today</b><div class="muted">Review these first, they are the ones you were about to forget.</div></span></div>
      <div class="row" style="margin-top:8px">${rows.filter((r) => r.due).map((r) => `<a class="btn small" href="#/flashcards/${r.s.id}/due">${r.s.name} (${r.due})</a>`).join('')}</div></div>` : ''}
    ${rows.map((r) => `<div class="card subject-card" data-s="${r.s.id}">
      <div class="row" style="align-items:center"><span class="sub-ico ${r.s.id}">${ico[r.s.id]}</span><span style="flex:1"><b style="font-size:1.1rem">${r.s.name}</b><div class="muted">${r.total} cards · ${r.seen} seen${r.due ? ` · <b style="color:var(--primary)">${r.due} due</b>` : ''}</div></span></div>
      <div class="progress" style="margin:8px 0"><span style="width:${Math.round(100 * r.seen / Math.max(1, r.total))}%"></span></div>
      <div class="row">
        <a class="btn" href="#/flashcards/${r.s.id}/${r.due ? 'due' : 'all'}">${r.due ? `Review ${r.due} due` : 'Start all cards'} →</a>
        <button class="btn secondary" data-toggle="${r.s.id}">Pick a chapter</button>
      </div>
      <div class="hidden" id="ch-${r.s.id}" style="margin-top:10px">
        <div class="stack">${syl[r.s.id].map((c) => { const has = r.fc.chapters.find((x) => x.slug === c.slug); return has ? `<a class="row spread step" style="padding:8px 12px" href="#/flashcards/${r.s.id}/${c.slug}"><span>${esc(c.title)}</span><span class="muted">${has.cards.length} cards →</span></a>` : ''; }).join('')}</div>
        <p class="muted" style="margin-top:8px">Tip: any chapter's practice questions can also be revised as cards from the chapter page.</p>
      </div>
    </div>`).join('')}
  </div>`);
  node.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => { const box = node.querySelector('#ch-' + b.dataset.toggle); box.classList.toggle('hidden'); b.textContent = box.classList.contains('hidden') ? 'Pick a chapter' : 'Hide chapters'; }));
  return node;
}
