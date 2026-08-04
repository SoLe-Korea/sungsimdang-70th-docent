# Cost reference

## Current: $0

- Hosting: GitHub Pages (free, public repo)
- Data: static JSON in-repo, no database
- Translation: pre-translated at authoring time, no runtime API calls
- Voice: browser `speechSynthesis` (Web Speech API), no TTS API calls
- QR codes: generated once locally, printed — not served dynamically

Nothing in the visitor-facing path scales with traffic, so cost stays $0
regardless of how many people scan the QR codes.

## If AI/neural voice is adopted later

Only relevant if the declined upgrade (see `DECISIONS.md`, 2026-08-05) is
revisited.

- One-time generation, not per-visit: pre-record mp3s once for all 3 floors
  × 6 languages (~68,000 characters total across all languages), then serve
  them as static files via the `audioUrl` field already supported in
  `docent.js`.
- Google Cloud TTS free tier (4M chars/month standard, 1M chars/month
  WaveNet neural) or Azure TTS free tier (500K chars/month neural) both
  comfortably cover this in a single generation pass — expected cost is
  still $0, just requires the user to create their own account and API key.
- Ongoing cost stays $0 after generation — the mp3s are static files, same
  as everything else in this project.
