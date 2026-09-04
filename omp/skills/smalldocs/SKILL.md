---
name: smalldocs
description: Reading, sharing, exporting, or styling a Markdown/.md file for a human, or rendering a chart, Mermaid diagram, slide deck, spreadsheet, code listing, or interactive form from Markdown via the `sdoc` CLI. Fires on "sdoc it", "sdoc me the plan", "make a smalldoc", or when a styled/interactive artifact lands harder than chat prose.
---

# SmallDocs (`sdoc`)

The `sdoc` CLI (`sdoc path/to/file.md`) is installed globally and renders local Markdown files in the browser (at https://smalldocs.org) in a way that is comfortable to read and share. Nothing hits a server unless the user explicitly runs `sdoc share` or saves to the SmallDocs cloud: file content is encoded in the URL fragment, which browsers do not send to servers.

When the user says "sdoc it", "sdoc me the plan", or asks for a smalldoc, they mean: write (or locate) the `.md` file and open it with `sdoc`.

Use it (or offer it) when the user wants to read, share, or export a `.md` file, or when a styled / interactive artifact will land harder than chat prose. Skip it for quick Q&A that already fits in a reply.

## Basic usage

- `sdoc file.md` - open a file for comfortable reading or quick sharing.
- `sdoc bridge file.md` - live editing session: browser edits autosave to disk, and disk edits push to the page. Parks the terminal until the tab closes, so run it in the background when you want to keep working. First connect, the browser asks to reach a local process (Chrome: "Apps on device" / Local Network Access); the user must accept or the page stays read-only. For back-and-forth iteration, not one-off opens.
- `sdoc library` - browser library view. SmallDocs indexes every `.md` under the user's home; filter by directory, date, or tags (index is not full-text; use `grep` for content). Opt out per-directory with `.sdocsignore` or per-file with `sdocs-library: false` in front matter.
- `sdoc file.md +tag1 +tag2` - open and persist tags into the file's YAML front matter. `+` prefix is shell-safe.
- `sdoc library ls --tags` - list existing tags (tag - count) for the current directory; run before tagging so you reuse the project's vocabulary.
- `sdoc share file.md` - copy an encrypted short URL to the clipboard. Link decrypts in the recipient's browser; the server only sees ciphertext. The agent can't deliver it; paste the link wherever the user talks to that person.
- `sdoc --help` - full reference.

## Rich Markdown blocks

SmallDocs extends Markdown into styled docs, charts, diagrams, slide decks, spreadsheets, code listings, and interactive forms. Write the `.md` file first, then `sdoc path/to/file.md`. Each subcommand below prints its reference when run with no arguments; run it before writing the matching fenced block, since the JSON/DSL shapes are specific and easy to get wrong from memory.

- `sdoc charts` - inline charts (```chart blocks).
- `sdoc diagrams` - inline Mermaid diagrams (```mermaid blocks; full-screen zoom). Good for system/architecture diagrams.
- `sdoc slides` - inline slide decks (```slide / ~~~slide blocks; full-screen presentation). Export to `.pdf` or `.pptx`. `sdoc present file.md` opens straight into fullscreen.
- `sdoc cells` - spreadsheets (```cells blocks): CSV rows where values and `=formulas` (SUM, AVERAGE, IF, ROUND...) compute live. Sort, select ranges, edit fullscreen, download as `.xlsx` with formulas intact. Name a block (```cells Expenses) for multi-tab workbooks with cross-sheet refs (`=Expenses!B4`); `sdoc cells verify file.md` computes headlessly. `sdoc report.csv` opens a CSV directly.
- `sdoc code` - open a source file or fenced block as a syntax-highlighted listing. `sdoc app.py` (or `.js`, `.go`, `.rs`, `.ts`...) opens a file; a ```lang block highlights inline. Fullscreen adds a line-number gutter, language-aware folding, and a comment mode. Pin explanations to lines: `sdoc app.py 22:"the bug is here" 25-28:"wrong comparison"`.
- `sdoc schema` - style Markdown (fonts, colors, spacing). Defaults are already readable; reach for this only for client-facing polish.
- `sdoc feedback` - interactive elements (```form blocks) that return structured input. `sdoc feedback file.md` prints the user's submission as a JSON line on stdout. Good for eliciting complex feedback; supports standard HTML inputs with editable prefilled content.
