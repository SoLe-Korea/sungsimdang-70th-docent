# GOTCHAS

## Bash: don't name a variable `status`

Polling `gh api .../pages/builds/latest --jq '.status'` into a shell variable
named `status` fails with `read-only variable: status` in this zsh session —
`status` is a reserved/readonly variable here. The assignment silently
corrupts the rest of the command, and subsequent commands in the same shell
invocation can fail in confusing ways (e.g. `curl` reported as "command not
found" even though it exists, because the shell state was already broken).

**Fix:** use a different variable name, e.g. `build_status`.

## Reading .docx files

The `Read` tool can't parse `.docx` directly. On macOS, extract plain text
with the built-in `textutil`:

```
textutil -convert txt -stdout "/path/to/file.docx"
```

Used this to pull the docent narration manuscripts out of the `.docx` files
on the Desktop for this project.

## "It's not deployed" is often just client-side cache

After pushing a content/layout fix and confirming the GitHub Pages build
succeeded, the user reported the live QR-linked page still showed the old
content. The deployed files were actually correct — confirmed by curling
both the raw JSON (`data/floor3.json`) and the rendered HTML directly from
`sole-korea.github.io`. The page's `data/*.json` responses carry
`cache-control: max-age=600`, and mobile Safari/Chrome cache aggressively on
top of that, so a phone that already visited the page can show stale
content for a while after a real deploy.

**Fix:** before concluding a deploy didn't take effect, `curl` the live URL
directly (bypasses device/browser cache) to check server-side truth first.
If the server is correct but the user still sees old content, it's a
client cache — have them hard-refresh or open the link in a private/
incognito tab rather than debugging the deploy pipeline.

## Design-team source PNGs often have no alpha channel

Logo/character PNGs pulled from `~/Desktop/성심당로고-케릭터/` are mostly
plain RGB with a solid white background baked in, not RGBA — `sips -g
hasAlpha <file>.png` returns `no` for most of them. Dropping one straight
into a page with a non-white background (this site's `--color-bg: #f7f5f1`
cream, not `#fff`) shows an ugly white box.

**Fix:** strip the white background to transparent before use:

```python
from PIL import Image
im = Image.open("source.png").convert("RGBA")
im.putdata([(r,g,b,0) if r>245 and g>245 and b>245 else (r,g,b,a) for r,g,b,a in im.getdata()])
im.save("assets/output.png")
```

Check `sips -g hasAlpha` on candidate files first — a few in that folder
(e.g. `무제-3-03.png`) already have real alpha and don't need this.

## Android TTS silently fails for languages without installed voice data

`speechSynthesis.getVoices()` on Android will *list* a language as
available even when its actual voice data was never downloaded to the
device. Calling `speak()` for that language then does nothing at all — no
`onerror`, no `onstart`, no sound, no exception. A real Galaxy phone
reproduced this identically in both Samsung Internet and Chrome: Korean and
Chinese spoke fine (voice data present), English/Japanese/Spanish/
Vietnamese produced total silence.

This is a device-level limitation, not a bug reachable from JS — no amount
of `cancel()`/`speak()` sequencing, voice-matching, or `localService`
preference fixes it, because the voice data genuinely isn't on the device.
A watchdog timer (missing `onstart` within ~1.5s ⇒ treat as failed) can at
least *detect* and report the failure instead of staying silent, but can't
make it work.

**Fix:** don't rely on live `speechSynthesis` for content that must work on
arbitrary/untestable visitor devices. Pre-record narration once (e.g. with
free `edge-tts`, see `runbooks/deploy.md`) and ship it as static audio
files — playback becomes a plain `<audio>` element, identical on every
device. Keep `speechSynthesis` only as a fallback for content that doesn't
have pre-recorded audio yet.
