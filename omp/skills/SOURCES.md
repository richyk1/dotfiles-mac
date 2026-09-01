# Vendored skills — provenance

These skills are vendored (committed) into the repo so a fresh clone works
offline. `install.sh` symlinks this directory to `~/.omp/skills`, which
`omp/config.yml` lists under `skills.customDirectories`. Each name must also
appear in `skills.includeSkills` (allowlist) to load.

Scanning is non-recursive: every `<name>/SKILL.md` here is one skill.

| Skill | Upstream | Path | License |
|---|---|---|---|
| karpathy-guidelines | github.com/multica-ai/andrej-karpathy-skills | skills/karpathy-guidelines | MIT |
| herdr | github.com/herdrdev/herdr @ v0.8.2 | skills/herdr | see upstream |
| gh-stack | github.com/github/gh-stack | skills/gh-stack | see upstream |
| animate | github.com/emilkowalski/skills | skills/animate | MIT |
| animation-vocabulary | github.com/emilkowalski/skills | skills/animation-vocabulary | MIT |
| apple-design | github.com/emilkowalski/skills | skills/apple-design | MIT |
| emil-design-eng | github.com/emilkowalski/skills | skills/emil-design-eng | MIT |
| find-animation-opportunities | github.com/emilkowalski/skills | skills/find-animation-opportunities | MIT |
| improve-animations | github.com/emilkowalski/skills | skills/improve-animations | MIT |
| prototype | github.com/emilkowalski/skills | skills/prototype | MIT |
| review-animations | github.com/emilkowalski/skills | skills/review-animations | MIT |
| caveman | github.com/JuliusBrussee/caveman | skills/caveman | MIT + BSL |
| caveman-compress | github.com/JuliusBrussee/caveman | skills/caveman-compress | MIT + BSL |
| caveman-commit | github.com/JuliusBrussee/caveman | skills/caveman-commit | MIT + BSL |
| caveman-review | github.com/JuliusBrussee/caveman | skills/caveman-review | MIT + BSL |
| caveman-stats | github.com/JuliusBrussee/caveman | skills/caveman-stats | MIT + BSL |
| caveman-help | github.com/JuliusBrussee/caveman | skills/caveman-help | MIT + BSL |
| cavecrew | github.com/JuliusBrussee/caveman | skills/cavecrew | MIT + BSL |
| impeccable | github.com/pbakaus/impeccable (built via `npx skills add`) | skills/impeccable | Apache-2.0 |
| claude-for-safari | github.com/SDLLL/claude-for-safari | skills/claude-for-safari | MIT |

## Updating a skill

Re-fetch the upstream subdirectory and overwrite the vendored copy, e.g.:

```
tmp=$(mktemp -d)
git clone --depth 1 --filter=blob:none --sparse https://github.com/emilkowalski/skills "$tmp"
git -C "$tmp" sparse-checkout set skills/animate
rm -rf omp/skills/animate && cp -R "$tmp/skills/animate" omp/skills/animate
rm -rf "$tmp"
```

`impeccable` is compiled from `SKILL.src.md`; rebuild with
`npx -y skills add pbakaus/impeccable --skill impeccable --agent claude-code --yes`
in a temp dir and copy the generated `.claude/skills/impeccable`.

## Not skills

- **smalldocs / sdoc** is not a skill — its installer writes a block into
  `~/.claude/CLAUDE.md` (a context file omp reads). Re-run the installer from
  https://smalldocs.org/#install on a new machine.
