# Can the next KCET paper be predicted from past papers?

A walk-forward backtest over all 54 KEA papers (2009-2026, 3190 questions, physics, chemistry, maths).
For every year Y we built a prediction using **only papers before Y**, then scored it against the real paper.

## Method

1. **Templates.** Every past question was labelled with a *question template*: the concept-level question type
   (for example "Doppler effect, source moving, find apparent frequency"). Physics 270 templates, chemistry 308,
   maths 280. Labels: `labels/<subject>.jsonl`, catalog: `templates/<subject>.json`, checker:
   `tools/validate-labels.mjs`. Labelling was done by AI assistants chapter by chapter; it is one person's judgement
   of granularity and is the main source of noise in these numbers.
2. **Prediction for year Y** (`tools/predict-backtest.mjs`): a chapter quota from recency-weighted chapter counts,
   then within each chapter the templates ranked by score, each with its most recent real question as the sample.
   Two rankings: *freq* (recency-weighted frequency) and *hazard* (measured probability that a template reappears,
   given how many times and how recently it appeared, estimated only from years before Y).
3. **Scoring** each real question of year Y:
   - **Exact**: predicted template, and the question is a near-verbatim repeat of an older question (token overlap >= 0.5).
   - **Similar**: predicted template, same question type with new numbers or wording. Counted as a hit.
   - **Miss (seen before)**: the template existed in earlier papers but was not in the 60 predicted. Learnable.
   - **Miss (new)**: the template had never appeared before. Not predictable by any method.
   - **Predictable ceiling** = 100% minus miss-new. **Verbatim repeats** = questions that are a near-verbatim repeat
     of any older question, whether predicted or not.

Per-year detail (prediction, every question's outcome, lessons) is in `results/<phase>/<year>-<subject>.json`.

## Phase 1: learning run, 2010-2020 (freq method, untuned)

| Year | Subject | Qs | Exact | Similar | Miss (seen before) | Miss (new) | Hit % | Predictable ceiling % | Verbatim repeats |
|---|---|---|---|---|---|---|---|---|---|
| 2010 | physics | 60 | 0 | 13 | 0 | 47 | **21.7%** | 21.7% | 0 |
| 2011 | physics | 60 | 1 | 19 | 8 | 32 | **33.3%** | 46.7% | 1 |
| 2012 | physics | 60 | 1 | 14 | 18 | 27 | **25%** | 55% | 1 |
| 2013 | physics | 60 | 1 | 22 | 21 | 16 | **38.3%** | 73.3% | 1 |
| 2014 | physics | 60 | 0 | 12 | 23 | 25 | **20%** | 58.3% | 1 |
| 2015 | physics | 60 | 0 | 17 | 27 | 16 | **28.3%** | 73.3% | 0 |
| 2016 | physics | 60 | 0 | 21 | 29 | 10 | **35%** | 83.3% | 1 |
| 2017 | physics | 60 | 2 | 14 | 34 | 10 | **26.7%** | 83.3% | 3 |
| 2018 | physics | 60 | 1 | 20 | 33 | 6 | **35%** | 90% | 4 |
| 2019 | physics | 60 | 0 | 15 | 35 | 10 | **25%** | 83.3% | 2 |
| 2020 | physics | 49 | 1 | 19 | 27 | 2 | **40.8%** | 95.9% | 3 |
| 2010 | chemistry | 60 | 0 | 21 | 0 | 39 | **35%** | 35% | 0 |
| 2011 | chemistry | 60 | 27 | 9 | 8 | 16 | **60%** | 73.3% | 29 |
| 2012 | chemistry | 60 | 2 | 15 | 13 | 30 | **28.3%** | 50% | 4 |
| 2013 | chemistry | 60 | 0 | 16 | 19 | 25 | **26.7%** | 58.3% | 1 |
| 2014 | chemistry | 60 | 0 | 11 | 22 | 27 | **18.3%** | 55% | 0 |
| 2015 | chemistry | 60 | 0 | 9 | 20 | 31 | **15%** | 48.3% | 2 |
| 2016 | chemistry | 60 | 1 | 11 | 34 | 14 | **20%** | 76.7% | 4 |
| 2017 | chemistry | 60 | 1 | 10 | 31 | 18 | **18.3%** | 70% | 2 |
| 2018 | chemistry | 60 | 2 | 13 | 26 | 19 | **25%** | 68.3% | 7 |
| 2019 | chemistry | 60 | 0 | 17 | 34 | 9 | **28.3%** | 85% | 1 |
| 2020 | chemistry | 60 | 0 | 15 | 28 | 17 | **25%** | 71.7% | 3 |
| 2010 | maths | 60 | 0 | 22 | 0 | 38 | **36.7%** | 36.7% | 1 |
| 2011 | maths | 60 | 2 | 13 | 15 | 30 | **25%** | 50% | 8 |
| 2012 | maths | 60 | 2 | 20 | 14 | 24 | **36.7%** | 60% | 3 |
| 2013 | maths | 60 | 1 | 21 | 18 | 20 | **36.7%** | 66.7% | 5 |
| 2014 | maths | 60 | 3 | 11 | 18 | 28 | **23.3%** | 53.3% | 6 |
| 2015 | maths | 60 | 2 | 8 | 28 | 22 | **16.7%** | 63.3% | 12 |
| 2016 | maths | 60 | 8 | 12 | 34 | 6 | **33.3%** | 90% | 16 |
| 2017 | maths | 60 | 11 | 7 | 28 | 14 | **30%** | 76.7% | 24 |
| 2018 | maths | 60 | 7 | 13 | 27 | 13 | **33.3%** | 78.3% | 19 |
| 2019 | maths | 60 | 4 | 12 | 35 | 9 | **26.7%** | 85% | 12 |
| 2020 | maths | 60 | 10 | 10 | 33 | 7 | **33.3%** | 88.3% | 19 |
| All |  | 1969 | 90 | 482 | 740 | 657 | **29.1%** | 66.6% | 195 |

## The pause after 2020: what we learned

- **Parameters do not matter.** A grid over decay, window and multiplicity moved the hit rate only between 25% and 30%.
- **The paper is a broad random draw.** Measured on 2012-2020, a template that was asked 4+ times and asked last year
  reappears with probability 32%; a template seen once in the last four years reappears with probability about 20%.
  No template is a near-certainty, so **any 60-slot "predicted paper" is capped near 30%**, and 73% of predicted
  slots never appear.
- **Over half of the learnable misses were templates seen only once before.** Frequency ranking cannot reach them.
- **The ceiling climbs every year.** By 2020, 90-96% of questions reuse an existing template. Novel question types are rare.
- **Old-syllabus chapters** (communication systems, solid state, surface chemistry, mathematical reasoning, groups) stop
  being asked; the hazard method halves the score of templates not seen within the window.
- **Verbatim repeats are a real, exploitable pattern, especially in maths**: 2011 chemistry copied 2010 almost wholesale
  (29 of 60); maths repeated 12-24 questions per year from 2015 on.
- Consequence: the useful product is not a 60-question paper but a **ranked practice list with a coverage curve**.

Tuned choice for phase 2: hazard ranking, chapter quota, 6-year recency window, report coverage at several list sizes.

## Phase 2: held-out test, 2021-2026 (hazard method)

| Year | Subject | Qs | Exact | Similar | Miss (seen before) | Miss (new) | Hit % | Predictable ceiling % | Verbatim repeats |
|---|---|---|---|---|---|---|---|---|---|
| 2021 | physics | 60 | 0 | 11 | 40 | 9 | **18.3%** | 85% | 0 |
| 2022 | physics | 60 | 0 | 19 | 35 | 6 | **31.7%** | 90% | 1 |
| 2023 | physics | 60 | 2 | 13 | 43 | 2 | **25%** | 96.7% | 3 |
| 2024 | physics | 51 | 0 | 13 | 36 | 2 | **25.5%** | 96.1% | 2 |
| 2025 | physics | 60 | 0 | 18 | 41 | 1 | **30%** | 98.3% | 1 |
| 2026 | physics | 60 | 1 | 15 | 43 | 1 | **26.7%** | 98.3% | 3 |
| 2021 | chemistry | 60 | 1 | 11 | 36 | 12 | **20%** | 80% | 2 |
| 2022 | chemistry | 60 | 0 | 13 | 41 | 6 | **21.7%** | 90% | 0 |
| 2023 | chemistry | 60 | 0 | 8 | 48 | 4 | **13.3%** | 93.3% | 4 |
| 2024 | chemistry | 45 | 0 | 9 | 34 | 2 | **20%** | 95.6% | 1 |
| 2025 | chemistry | 60 | 1 | 11 | 46 | 2 | **20%** | 96.7% | 6 |
| 2026 | chemistry | 60 | 0 | 13 | 42 | 5 | **21.7%** | 91.7% | 2 |
| 2021 | maths | 60 | 1 | 12 | 42 | 5 | **21.7%** | 91.7% | 10 |
| 2022 | maths | 60 | 9 | 19 | 27 | 5 | **46.7%** | 91.7% | 18 |
| 2023 | maths | 60 | 8 | 8 | 41 | 3 | **26.7%** | 95% | 20 |
| 2024 | maths | 45 | 2 | 10 | 28 | 5 | **26.7%** | 88.9% | 7 |
| 2025 | maths | 60 | 10 | 9 | 38 | 3 | **31.7%** | 95% | 21 |
| 2026 | maths | 60 | 7 | 13 | 37 | 3 | **33.3%** | 95% | 21 |
| All |  | 1041 | 42 | 225 | 698 | 76 | **25.6%** | 92.7% | 122 |

Coverage versus list size on 2021-2026 (share of real questions whose template is in the list):

| Templates practised | freq | hazard |
|---|---|---|
| 60 | 26.7% | 25.6% |
| 90 | 37.7% | 37.1% |
| 120 | 49.5% | 50.5% |
| 150 | 59.9% | 61.2% |
| 200 | 72.5% | 77.8% |
| 300 (all seen) | 73.8% | 92.7% |

## Answer

- A **60-question predicted paper** matches about **26% of the real paper** by question type (2021-2026 held out),
  and about 4% as near-verbatim repeats. The learning run (2010-2020) gave 29%, so the method generalises.
- A **200-template practice list covers about 78%** of the real paper; everything ever asked covers 93%. In 2023-2026
  only 1-5 questions per paper were a question type never seen before.
- **Verbatim repeats:** physics 1-3 per paper, chemistry 0-6, **maths 7-21 per paper**. Practising every past maths
  paper directly answers up to a third of the paper.
- Most-missed known templates in the held-out years: PCC oxidation reagent, unit-cell edge/radius/density, IUPAC naming
  of complexes, determinant property statements, Grignard/hydroboration sequences, oxidation numbers.

## 2027 prediction

`predict-2027-<subject>.md` / `.json`: expected questions per chapter, the top-60 predicted paper and the 200-template
practice list, each template with its reappearance probability, how often and when it was asked, and a sample past
question to practise. Average probability of a top-60 template appearing is 0.19-0.23, which is the honest confidence.

## Caveats

- Templates were defined after seeing all years, so the catalog itself carries hindsight; this inflates the ceiling
  for early years but not the hit rate of the ranking, which only sees earlier papers.
- 2024 papers have 45-51 usable questions (the rest were excluded or unreadable in the archive).
- Reproduce: `node tools/predict-backtest.mjs --years 2010-2020`, `--years 2021-2026 --method hazard`, `--curve`,
  `--tune`, `--predict 2027`.
