#!/usr/bin/env bash
# Symlink dotfiles into place. Idempotent. Backs up any existing real file to *.bak.
set -euo pipefail
DOTFILES="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

link() { # link <repo-relative-src> <abs-dest>
  local src="$DOTFILES/$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [ -L "$dest" ]; then rm "$dest"
  elif [ -e "$dest" ]; then mv "$dest" "$dest.bak"; echo "backed up $dest -> $dest.bak"; fi
  ln -s "$src" "$dest"
  echo "linked $dest"
}

seed() { # seed <repo-relative-example> <abs-dest>  (copy only if dest missing)
  local src="$DOTFILES/$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [ -e "$dest" ]; then echo "kept existing $dest"; else cp "$src" "$dest"; echo "seeded $dest (fill in secrets)"; fi
}

# --- symlinked config ---
link ghostty/config                       "$HOME/.config/ghostty/config"
link aerospace/aerospace.toml             "$HOME/.aerospace.toml"
link zsh/.zshrc                           "$HOME/.zshrc"
link zsh/.zprofile                        "$HOME/.zprofile"
link omp/config.yml                       "$HOME/.omp/agent/config.yml"
link omp/lsp.json                         "$HOME/.omp/agent/lsp.json"
link omp/agents/swiftui-expert.md         "$HOME/.omp/agent/agents/swiftui-expert.md"
link omp/extensions/herdr-omp-agent-state.ts "$HOME/.omp/agent/extensions/herdr-omp-agent-state.ts"
link omp/extensions/tailscale-coms.ts     "$HOME/.omp/agent/extensions/tailscale-coms.ts"

# --- secret files: seeded from templates, never symlinked, never committed ---
seed zsh/.zsh_secrets.example             "$HOME/.zsh_secrets"
seed omp/models.yml.example               "$HOME/.omp/agent/models.yml"
seed omp/mcp.json.example                 "$HOME/.omp/agent/mcp.json"

echo
echo "Done. Next steps on a fresh machine:"
echo "  1. Fill in real secrets: ~/.zsh_secrets, ~/.omp/agent/models.yml, ~/.omp/agent/mcp.json"
echo "  2. Install prereqs the .zshrc expects: oh-my-zsh, homebrew, fnm, pyenv."
