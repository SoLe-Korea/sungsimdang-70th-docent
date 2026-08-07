# Runbook: deploy / redeploy the docent site

Applies to this repo (`sungsimdang-70th-docent`), hosted on GitHub Pages at
https://sole-korea.github.io/sungsimdang-70th-docent/.

## Redeploying after a content or code change

1. Edit whatever changed (usually `data/floor3.json`, `data/floor4.json`, or
   `data/floor5.json` for manuscript/translation edits; layout/structure
   changes, like moving the audio controls, touch `floor{3,4,5}/index.html`
   instead — keep all three floor HTML files identical to each other).
2. Validate JSON before committing:
   ```
   python3 -c "import json; json.load(open('data/floor3.json'))"
   ```
   (repeat for floor4.json / floor5.json if edited)
3. Commit and push:
   ```
   git add -A
   git commit -m "..."
   git push
   ```
4. GitHub Pages rebuilds automatically on push to `main`. Poll build status:
   ```
   gh api repos/SoLe-Korea/sungsimdang-70th-docent/pages/builds/latest --jq '.status'
   ```
   (name the variable anything but `status` — see GOTCHAS.md)
   Wait for `"built"`, usually 30-90s.
5. Verify live — check the server, not your own phone/browser first:
   ```
   curl -s -o /dev/null -w "%{http_code}\n" https://sole-korea.github.io/sungsimdang-70th-docent/floor3/
   curl -s https://sole-korea.github.io/sungsimdang-70th-docent/data/floor3.json
   ```
   Expect `200` and the JSON to show the change. If the user reports the
   live page still looks old after this passes, it's client-side caching
   (see GOTCHAS.md) — have them hard-refresh or use a private/incognito tab
   before assuming the deploy failed.

## First-time setup (already done, for reference)

- Repo created with `gh repo create sungsimdang-70th-docent --public --source=. --remote=origin --push`
  (requires `gh auth status` already logged in — was authenticated as
  `SoLe-Korea`).
- Pages enabled via:
  ```
  gh api repos/SoLe-Korea/sungsimdang-70th-docent/pages -X POST \
    -f "source[branch]=main" -f "source[path]=/"
  ```
- `.claude/`, `.omc/`, `.DS_Store` are gitignored — never commit local
  harness/tooling state to this public repo.

## Regenerating narration audio

Voice narration is pre-recorded mp3, not live browser TTS (see the wiki
architecture doc for why). Regenerate it whenever `content` text changes in
any `data/floor{3,4,5}.json`, or when adding a new floor.

1. Install `edge-tts` if not already (free, no API key, no signup):
   ```
   pip3 install --user edge-tts
   export PATH="$PATH:$(python3 -m site --user-base)/bin"
   ```
2. Generate mp3s for one language/floor or everything -- the script reads
   `content[lang]` straight from the JSON, so edit the JSON first:
   ```python
   # scratch script, not committed -- adapt floor/lang args as needed
   import asyncio, json, os, edge_tts

   VOICES = {
       "ko": "ko-KR-SunHiNeural", "en": "en-US-AriaNeural",
       "zh": "zh-CN-XiaoxiaoNeural", "ja": "ja-JP-NanamiNeural",
       "es": "es-ES-ElviraNeural", "vi": "vi-VN-HoaiMyNeural",
   }
   RATE = "-8%"

   async def gen(floor, lang, text):
       out = f"audio/{floor}-{lang}.mp3"
       await edge_tts.Communicate(text, VOICES[lang], rate=RATE).save(out)
       print(out, os.path.getsize(out), "bytes")

   async def main():
       data = json.load(open(f"data/floor3.json"))
       await gen("floor3", "en", data["content"]["en"])

   asyncio.run(main())
   ```
3. Confirm `data/floor{3,4,5}.json` has an `audioUrl` entry per language
   pointing at `../audio/floor{N}-{lang}.mp3` (relative to `floor{N}/index.html`).
   `docent.js` prefers `audioUrl` and only falls back to live
   `speechSynthesis` if a language's entry is missing.
4. Spot-check playback locally (`python3 -m http.server` from repo root,
   open `floor{N}/index.html`) before committing -- listen for mispronounced
   proper nouns (Sungsimdang, Daejeon, founder/staff names), since neural
   TTS sometimes guesses wrong on names not in its training data.
5. Commit the regenerated mp3s along with the JSON change and push per the
   steps above. mp3s are binary and don't diff meaningfully in review --
   sanity-check by file size and a listen, not by reading the diff.

## QR codes

QR codes point directly at the floor URLs (not the root landing page) and
were generated once with Python `qrcode` — regenerate only if the deployed
URL/domain ever changes:

```python
import qrcode
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=4)
qr.add_data("https://sole-korea.github.io/sungsimdang-70th-docent/floor3/")
qr.make(fit=True)
qr.make_image(fill_color="black", back_color="white").save("floor3.png")
```

Saved copies live in `~/Desktop/문화원/QR코드/` (outside this repo — they're
print assets, not site source).
