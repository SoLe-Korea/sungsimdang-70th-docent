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
