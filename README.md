# KCET Prep — free Karnataka CET practice

**Live app:** https://pu.sirigannada.in · **By:** [Sirigannada](https://sirigannada.in) · **Feedback:** https://forms.gle/YW9CKJa22dX5C2ph8

## What is this?

A free, offline-first web app for students preparing for **KCET (Karnataka Common Entrance Test), Engineering stream** — Physics, Chemistry and Mathematics. Open it on any phone, tablet or laptop; you can "install" it to your home screen and it keeps working without internet.

Inside:

- **74 chapters** (1st + 2nd PUC syllabus) with short notes and ~40 practice questions each, every question with a one-line exam trick and a full worked explanation.
- **18 years of real KCET papers (2009–2026)**, scored with the official KEA answer keys, playable as timed tests or browsed with answers.
- **Daily 10** questions with a streak, **flashcards** with spaced repetition, **speed drills**, full-length **mock tests** in the exact exam pattern, and a **study planner** built around your exam date.
- Progress tracking, a mistake notebook ("why did I get this wrong?"), and a **weekly report card** you can share as an image.

## Why?

Coaching classes and paid apps are out of reach for many students, especially in villages and small towns. Good practice material for KCET exists but is scattered, expensive, or full of ads. This project puts everything a student needs in one place, for free, forever.

- **Non-profit.** No ads, no paid tier, no upsell.
- **No account, no personal tracking.** Your progress lives only on your own device (you can export a backup from Settings). The site uses Cloudflare Web Analytics for anonymous visit counts only: no cookies, no personal data.
- **Open source.** Anyone can check the questions, fix mistakes, or run their own copy.

## How to use it

1. Open https://pu.sirigannada.in. On a phone, use **Add to Home Screen** (the app shows you how).
2. Tell it your exam date. It builds a day-by-day plan.
3. Every day, do the **three things** on the home page: Daily 10, one chapter, and flashcards or a test.
4. Before a chapter, take the 2-minute **quick check**. Score 4/5 or more and you can skip the notes.
5. Read every explanation, even when you were right. Tag your mistakes so the app can show you your pattern.
6. In the last weeks, solve the **past papers** under time. There is no negative marking in KCET — never leave a question blank.
7. On Wi-Fi once, open Settings → **Save all chapters for offline**.

## Not official. Mistakes are possible.

This app is **not affiliated with the Karnataka Examinations Authority (KEA)** or the Department of Pre-University Education. Past-paper answers follow the official KEA keys; where the official key contradicts standard textbook physics, chemistry or maths, the question is marked *disputed* and both are shown. All other questions were written and checked by volunteers and AI assistants, and **some may still be wrong**. If you find one, tap **Report a mistake** under the question (it copies the question ID) and tell us through the form. Official information about the exam: https://cetonline.karnataka.gov.in

## Contributing

Everything is plain JSON and vanilla JavaScript — no build step. See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- fixing or adding questions and notes,
- adding a past paper,
- translating notes and explanations (Kannada data files already exist under `data/kn/`),
- running the app locally and the validators.

## Licence

Code is released under the [MIT Licence](LICENSE). Original notes, questions, explanations and flashcards are released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — reuse them, credit "KCET Prep by Sirigannada". Past question papers and answer keys are public documents published by KEA and are reproduced here for non-commercial educational use.
