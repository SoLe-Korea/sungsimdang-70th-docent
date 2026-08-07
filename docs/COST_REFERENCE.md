# Cost reference

## Current: $0

- Hosting: GitHub Pages (free, public repo)
- Data: static JSON in-repo, no database
- Translation: pre-translated at authoring time, no runtime API calls
- Voice: pre-recorded mp3 narration (18 files, ~48MB total — 3 floors ×
  6 languages), generated once with `edge-tts` (free, no API key, no
  signup — see `DECISIONS.md`, 2026-08-07). Live browser `speechSynthesis`
  remains only as a fallback, still zero-cost either way.
- QR codes: generated once locally, printed — not served dynamically

Nothing in the visitor-facing path scales with traffic, so cost stays $0
regardless of how many people scan the QR codes. GitHub Pages has no
published hard storage cap for a repo this size (48MB of audio + assets is
well within normal use); revisit only if many more floors/languages get
added and total audio size grows substantially.

## Regenerating audio

Free, one-time generation cost (compute time only, no API billing) — see
`runbooks/deploy.md` for the `edge-tts` command. Re-run only when narration
text in `data/floor{3,4,5}.json` changes.
