# STATUS

_Last updated: 2026-08-06_

## Current state

**Live and working.** Deployed to GitHub Pages, verified by the user
scanning QR codes on their own phone. Latest changes: added the Sungsimdang
wordmark logo to the top of all three floor pages (commit `c8e9b45`), and
removed the founders' baptismal names from the floor5 founder mention
across all 6 languages (commit `f889e6f`). Both pushed and deployed.

- Repo: https://github.com/SoLe-Korea/sungsimdang-70th-docent (public)
- Live site: https://sole-korea.github.io/sungsimdang-70th-docent/
  - `/floor3/`, `/floor4/`, `/floor5/`
- QR codes: printed-ready PNGs in `~/Desktop/문화원/QR코드/`
  (`3층_QR.png`, `4층_QR.png`, `5층_QR.png`), pointing at the floor URLs above.
- Content: real docent manuscript (Korean original + ko/en/zh/ja/es/vi
  translations) in `data/floor3.json`, `data/floor4.json`, `data/floor5.json`.
- Voice: browser Web Speech API, rate tuned to 0.92 for a less rushed feel.

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

## Explicitly not doing (for now)

- **AI/neural voice pre-recording** — evaluated, user declined after trying
  the free rate tweak. See project memory `dont-push-paid-upgrades-unprompted`
  — don't re-raise this unprompted.

## Next steps (only if asked)

- If exhibition content changes, edit the relevant `data/floor{3,4,5}.json`
  and follow `runbooks/deploy.md` to redeploy.
- If the user later wants natural AI voice, the `audioUrl` extension point
  in `docent.js`/JSON is already in place — see
  `wiki/sungsimdang-docent-architecture.md`.

## Open question (undecided)

- User raised removing the personal GitHub account name (`sole-korea`) from
  the customer-facing URL. Two options on the table: free GitHub
  Organization transfer vs. a paid custom domain. **Either one changes the
  live URL and invalidates the already-printed QR codes** — reprinting
  would be required. No decision made yet; ask before acting.
