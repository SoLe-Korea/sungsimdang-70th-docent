# STATUS

_Last updated: 2026-08-07_

## Current state

**Live and working.** Deployed to GitHub Pages. Latest changes: switched
voice narration from live browser TTS to pre-recorded mp3 audio after a
real Galaxy device showed live TTS silently failing for 4 of 6 languages
(commits `f69c317`, `081ecd9`) — see `GOTCHAS.md` and `DECISIONS.md`
(2026-08-07).

- Repo: https://github.com/SoLe-Korea/sungsimdang-70th-docent (public)
- Live site: https://sole-korea.github.io/sungsimdang-70th-docent/
  - `/floor3/`, `/floor4/`, `/floor5/`
- QR codes: printed-ready PNGs in `~/Desktop/문화원/QR코드/`
  (`3층_QR.png`, `4층_QR.png`, `5층_QR.png`), pointing at the floor URLs above.
- Content: real docent manuscript (Korean original + ko/en/zh/ja/es/vi
  translations) in `data/floor3.json`, `data/floor4.json`, `data/floor5.json`.
- Voice: pre-recorded mp3 narration (`audio/floor{3,4,5}-{lang}.mp3`, 18
  files, generated with `edge-tts`), wired via each floor JSON's `audioUrl`.
  Live `speechSynthesis` (rate 0.92) remains as a fallback only.

## What's done

- [x] Static site scaffolded (floor pages, shared JS/CSS, JSON data model)
- [x] Real docent manuscript sourced from `.docx` files and translated into
      6 languages
- [x] Floor numbering corrected from placeholder 1/2/3 to real 3/4/5
- [x] Git repo initialized, committed, pushed
- [x] Deployed to GitHub Pages, verified live (curl + user's own phone scan)
- [x] QR codes generated and saved to `~/Desktop/문화원/QR코드/`
- [x] TTS playback rate tuned for a slightly more natural feel
- [x] Audio play/stop buttons moved above title/content (all 3 floor pages)
- [x] Removed leading "오프닝"/"Opening"/etc. label from floor3 content
      (all 6 languages)
- [x] Sungsimdang wordmark logo added to top of all 3 floor pages
      (`assets/sungsimdang-logo.png`, background stripped transparent)
- [x] Removed founders' baptismal/confirmation names from floor5 founder
      mention (all 6 languages)
- [x] Diagnosed and mitigated Android `speechSynthesis` reliability
      (local-voice preference, race-condition delay, silent-failure
      watchdog, in-app-browser detection) — helped, but didn't fully fix
      Galaxy devices missing voice data for some languages
- [x] Generated pre-recorded mp3 narration (edge-tts, free) for all 3
      floors × 6 languages and wired via `audioUrl` — this is now the
      primary voice path, `speechSynthesis` is fallback-only

## Next steps (only if asked)

- If exhibition content changes, edit the relevant `data/floor{3,4,5}.json`
  **and regenerate the matching audio file(s)** — see `runbooks/deploy.md`.
  Editing the JSON text alone no longer updates what visitors hear.
- User asked to be told if the narrator voices sound off (tone, or
  mispronounced proper nouns like Sungsimdang/Daejeon/founder names) after
  listening on the live site — awaiting that feedback, not yet confirmed.

## Open question (undecided)

- User raised removing the personal GitHub account name (`sole-korea`) from
  the customer-facing URL. Two options on the table: free GitHub
  Organization transfer vs. a paid custom domain. **Either one changes the
  live URL and invalidates the already-printed QR codes** — reprinting
  would be required. No decision made yet; ask before acting.
