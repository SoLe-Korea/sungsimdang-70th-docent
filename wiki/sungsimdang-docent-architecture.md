# Architecture: Sungsimdang docent QR site

Static mobile-web docent system for 성심당 창업 70주년 특별전 《오래된 진심》,
covering floors 3, 4, and 5. Every design choice traces back to one
constraint the project started with: **zero ongoing cost, no paid APIs, no
app install.**

## Why static, no build step

Hosting (GitHub Pages), data storage (JSON files in the repo), QR generation,
translation, and voice are all resolved without a server or a paid service:

- **Hosting**: GitHub Pages — free, unlimited-enough bandwidth for a
  single-exhibition audience, deploys on `git push`.
- **Data**: plain JSON files (`data/floor{3,4,5}.json`) committed to the
  repo. No database — traffic never scales the cost because it's all static
  reads.
- **Translation**: pre-translated at authoring time (by Claude, from the
  Korean docent manuscript) and stored as static text, not fetched from a
  translation API at runtime.
- **Voice**: pre-recorded mp3 narration (`audio/floor{3,4,5}-{lang}.mp3`),
  generated once at authoring time with `edge-tts` (free, no API key --
  see `runbooks/deploy.md`) and served as static files, same cost profile
  as the JSON/images. Falls back to the browser's own `speechSynthesis`
  (Web Speech API) if a file is ever missing for a language.
- **QR codes**: generated once (Python `qrcode`, see `runbooks/deploy.md`)
  and printed. They're static images pointing at fixed URLs — not generated
  per-visit.

Nothing in the visitor-facing path calls out to a third-party service. Cost
does not grow with visitor count.

## File structure

```
index.html          admin/test landing page only — real visitors never see this
floor3/index.html    each floor page is near-identical, differing only in
floor4/index.html    <body data-floor="N"> and <title>
floor5/index.html
css/style.css        shared, mobile-first
js/docent.js         shared logic for all floor pages (see below)
data/floor3.json      per-floor content: title + content + audioUrl, keyed by language
data/floor4.json
data/floor5.json
audio/floor{3,4,5}-{ko,en,zh,ja,es,vi}.mp3  pre-recorded narration, 18 files
assets/sungsimdang-logo.png  brand wordmark, shown at the top of every floor
                              page via the `.brand-logo` CSS class
```

Brand/logo assets pulled from design-team source files often have a solid
white background baked in (no alpha channel) — see GOTCHAS.md before adding
another one, since this page's background is cream (`#f7f5f1`), not white.

## `docent.js` responsibilities

1. Reads `data-floor` off `<body>`, fetches `../data/floor{N}.json`
   (same-origin relative fetch, not an external call).
2. Renders 6 language chips (ko/en/zh/ja/es/vi); remembers the visitor's
   last pick in `localStorage` so re-scanning a QR on another floor keeps
   the same language.
3. Renders `title`/`content` for the selected language as plain text
   (`textContent`) — the content container has `white-space: pre-line` in
   CSS so `\n`/`\n\n` in the JSON produces real line/paragraph breaks.
4. Voice playback: if `audioUrl[lang]` exists (it does, for every floor and
   language as of 2026-08-07), plays that pre-recorded mp3 via `<audio>`.
   Otherwise falls back to `speechSynthesis` with a `SpeechSynthesisUtterance`
   (rate 0.92, matched to the closest available voice for that BCP-47
   language code, preferring local over remote voices). Same play/pause/stop
   UI drives whichever mechanism is active.

## Content maintenance model

Editing the exhibition script should never require touching html/css/js —
only `data/floor{3,4,5}.json`. Each floor's JSON has `title` and `content`
objects keyed by `ko`/`en`/`zh`/`ja`/`es`/`vi`. Adding a language means
adding a new key to every floor's JSON; no code changes.

Layout/structure changes (e.g. reordering the audio controls above the
title, done 2026-08-05) are the exception — those touch
`floor{3,4,5}/index.html` directly. The three floor HTML files are meant to
stay byte-identical to each other apart from `<body data-floor>` and
`<title>`, so any structural edit should be applied to all three.

## Why pre-recorded audio replaced live speechSynthesis (2026-08-07)

The site originally spoke `content[lang]` aloud at visit time via the
browser's `speechSynthesis` (Web Speech API) -- free, but it turned out
unreliable across Android devices in a way no client-side code could fully
fix: a real Galaxy phone played Korean and Chinese fine but produced
*complete silence, with no error of any kind*, for English/Japanese/
Spanish/Vietnamese, reproducing identically in both Samsung Internet and
Chrome. Investigation (see the two rounds of `docent.js` mitigation before
this one, still visible in git history) narrowed it to a device-level
limitation JS cannot detect or route around: Android's TTS engine only
speaks languages whose voice data is actually downloaded on that specific
device, and `getVoices()` will happily *list* a language as available even
when the data isn't there -- `speak()` for it then does nothing, silently.
Since exhibition visitors' phones are arbitrary and untestable in advance,
no on-device Settings fix could be relied on.

The fix: generate real narration once, at authoring time, with `edge-tts`
(Microsoft's neural voices, free, no API key, no signup -- see
`runbooks/deploy.md` for the regeneration command) and ship the mp3s as
static files. This keeps the zero-recurring-cost constraint intact --
generation is a one-time build step, not a per-visitor API call -- while
making playback identical on every device, since it's just an `<audio>`
element rather than a device-dependent OS engine.

`speechSynthesis` remains as the fallback path in `docent.js` (used only if
`audioUrl[lang]` is ever missing, e.g. a future floor added without audio
yet) with its earlier reliability work kept: local-voice preference, a
delay between `cancel()`/`speak()` to dodge an Android race condition, a
watchdog that surfaces a notice if playback never actually starts, and
in-app-browser (KakaoTalk/Naver) detection.
