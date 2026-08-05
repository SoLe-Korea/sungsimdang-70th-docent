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
