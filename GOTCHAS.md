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
