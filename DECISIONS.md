# DECISIONS

ADR-style log of notable decisions for this project. Append-only.

## 2026-08-04 — Zero-cost static architecture, no backend, no paid APIs

**Decision:** Build the docent site as a fully static HTML/CSS/JS site with
no build step, no framework, no database, and no paid third-party APIs
(translation, TTS, or otherwise).

**Alternatives considered:** A small backend/CMS for editing content without
touching JSON directly; a paid TTS API for narration.

**Why:** Explicit requirement from the first requirements conversation —
initial cost target was $0, no paid APIs, no app install, scan-and-go on
mobile web. A static architecture makes cost independent of visitor count by
construction (see `wiki/sungsimdang-docent-architecture.md`).

## 2026-08-04 — Floor numbering corrected: 1/2/3 → 3/4/5

**Decision:** Rename all floor directories, data files, and HTML
`data-floor` attributes from placeholder 1/2/3 to the exhibition's real
building floors, 3/4/5.

**Why:** Built with 1/2/3 as a default assumption before confirming with the
user; user corrected it mid-session. See memory
`verify-physical-numbering-before-building`.

## 2026-08-04 — GitHub Pages over Cloudflare Pages

**Decision:** Deploy to GitHub Pages rather than Cloudflare Pages.

**Alternatives considered:** Cloudflare Pages (unlimited bandwidth, but
requires a `wrangler` OAuth login flow).

**Why:** `gh` CLI was already authenticated as `SoLe-Korea` with no extra
login step needed; user confirmed this tradeoff explicitly (asked via
AskUserQuestion) and picked GitHub Pages, public repo.

## 2026-08-05 — Browser Web Speech API for voice, AI voice declined for now

**Decision:** Ship with the browser's built-in `speechSynthesis` for
narration (tuned to `rate = 0.92`), rather than pre-recording AI/neural TTS
audio.

**Alternatives considered:** Pre-generate mp3s once via a free-tier neural
TTS API (Google Cloud TTS / Azure), wired through the `audioUrl` extension
point already built into `docent.js`. Got as far as opening the Google
Cloud Console API-enablement page for the user.

**Why:** User tried the free rate tweak, found it acceptable, and explicitly
said the AI-voice work "isn't needed" — cancelled mid-setup. See memory
`dont-push-paid-upgrades-unprompted`. The extension point remains in place
if this is revisited later.

## 2026-08-07 — Pre-recorded audio (edge-tts) replaces live speechSynthesis

**Decision:** Generate real mp3 narration once for all 3 floors × 6
languages using `edge-tts` (Microsoft neural voices, free, no API key, no
signup) and serve them as static files via the `audioUrl` field
`docent.js` already supported. Live `speechSynthesis` is kept only as a
fallback for any language/floor missing an audio file.

**Alternatives considered:** Kept trying to make live `speechSynthesis`
reliable — preferring local over remote voices, delaying `speak()` after
`cancel()` to dodge an Android race condition, a watchdog to detect and
report silent failures, in-app-browser detection. All shipped and helped,
but a real Galaxy device still produced total silence (no error at all) for
English/Japanese/Spanish/Vietnamese in both Samsung Internet and Chrome —
see `GOTCHAS.md`. Root cause was device-level (no TTS voice data installed
for those languages), which no client-side JS can detect or route around,
and visitor devices can't be pre-vetted.

**Why:** This supersedes the 2026-08-05 decision to use live
`speechSynthesis` and decline pre-recorded voice — that decision assumed
the paid Google Cloud/Azure TTS route (correctly declined, see memory
`dont-push-paid-upgrades-unprompted`). `edge-tts` reaches the same
pre-recorded-audio architecture at zero cost, so it isn't a re-litigation
of the declined paid option — it's a free path to the same already-built
`audioUrl` extension point, adopted once live TTS was confirmed unreliable
on real hardware rather than just in theory.
