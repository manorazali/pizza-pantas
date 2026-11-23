# Pizza Pantas 🍕

A fast-paced pizza-shop game where **Form 1 maths (KSSM, Malaysia) is the gameplay**.
Permainan restoran pizza untuk **Matematik Tingkatan 1** — semua 13 bab ikut DSKP.

Customers arrive and lose patience. Read the order, put the right toppings on the 8 numbered slices, bake the pizza before it burns, then solve the counter challenge. The maths in the order's wording decides the toppings; the counter challenge is a Form 1 problem.

## Features

- **13 chapters** following the official DSKP KSSM Matematik Tingkatan 1 (Rational Numbers → Pythagoras Theorem). Each chapter has its own order types and counter problems; questions are generated randomly.
- **Guest or login.** Guests keep scores in the browser. Logged-in players keep scores in the cloud (Cloudflare Worker + D1) and can use them on any device.
- **Score summary.** Stars, first-try accuracy per chapter, weakest topics, recent games, and a print button.
- No e-mail or real name collected; players can delete their own account and data.

## Project layout

```
index.html, style.css      the page
syllabus.js                13 chapters + question generators (the maths)
game.js                    game engine and screens
api.js                     guest / login / score storage client
config.js                  set API_URL here after deploying the Worker
worker/                    Cloudflare Worker + D1 API (worker.js, schema.sql, README.md)
```

## Run it

It is plain HTML/CSS/JS, so there is no build step. Open `index.html`, or serve the folder with any static server.
With `API_URL` empty in `config.js`, the game runs in **guest mode** only.

## Turn on login (Cloudflare)

Follow [`worker/README.md`](worker/README.md), then put the Worker URL in [`config.js`](config.js).
Set the Worker's `ALLOWED_ORIGINS` to the site's origin, for example `https://manorazali.github.io`.

## Notes

- Scores are sent by the browser, so a determined player can fake them. It suits practice and progress tracking, not competitions or official grades.
- There is no password recovery (no e-mail). If you use this with under-13s, check your school's consent / PDPA requirements.
- Questions are extra practice. Check the textbook and your teacher.

## Status

Tested locally: all 13 chapters played end to end, and the Worker tested against an in-memory SQLite stand-in for D1. **Not yet tested on a real Cloudflare account or a real phone.**
