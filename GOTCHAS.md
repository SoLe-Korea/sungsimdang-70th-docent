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
