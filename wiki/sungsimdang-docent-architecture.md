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
- **Voice**: the browser's own `speechSynthesis` (Web Speech API). No TTS
  API call, no per-character cost, works offline once the page is cached.
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
data/floor3.json      per-floor content: title + content, keyed by language
data/floor4.json
data/floor5.json
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
4. Voice playback: if `content[lang].audioUrl` exists, plays that file via
   `<audio>`. Otherwise falls back to `speechSynthesis` with a
   `SpeechSynthesisUtterance` (rate 0.92, matched to the closest available
   voice for that BCP-47 language code). This `audioUrl` field is the
   deliberate extension point for pre-recorded AI voice later — dropping an
   mp3 URL into the JSON is enough, no JS/HTML changes needed. Not currently
   used; the user evaluated it and declined for now.

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

## Known limitation

Browser `speechSynthesis` voices are noticeably robotic compared to AI TTS,
and quality varies a lot by device/OS voice pack. This is the tradeoff for
staying at zero cost. The `audioUrl` extension point exists specifically so
this can be upgraded later (pre-generate mp3s once via a free-tier neural
TTS API, since it's a one-time generation cost, not a per-visitor one)
without any architecture change.

iOS Safari ships every language voice built into the OS (AVSpeechSynthesizer),
so it always works. Android's TTS engine only has voices actually downloaded
on that device -- and critically, `getVoices()` often *lists* a language as
supported even when its voice data was never downloaded, so `speak()` for
that language fails completely silently (no error event, no sound). Fixed
2026-08-07 in `docent.js`: a short watchdog timer after `speak()` treats a
missing `onstart` as a failure and surfaces an actionable notice (install
the language pack via Android Settings, or open outside a messenger in-app
browser -- KakaoTalk/Naver in-app WebViews frequently don't implement Web
Speech API at all, detected via user-agent sniffing).
