# Aggressive startup optimizations
DISABLE_AUTO_UPDATE="true"
DISABLE_MAGIC_FUNCTIONS="true"
DISABLE_COMPFIX="true"
DISABLE_UNTRACKED_FILES_DIRTY="true"
DISABLE_AUTO_TITLE="true"
ZSH_DISABLE_COMPFIX="true"

# Highly optimized completion initialization
autoload -Uz compinit
if [[ -n ${ZDOTDIR}/.zcompdump(#qN.mh+24) ]]; then
    compinit -d "${ZDOTDIR:-$HOME}/.zcompdump"
else
    compinit -C -d "${ZDOTDIR:-$HOME}/.zcompdump"
fi

# Path to your oh-my-zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load
ZSH_THEME="afowler"

# Minimal plugins for speed
plugins=(git)

source $ZSH/oh-my-zsh.sh

# Environment variables (grouped for efficiency)
export ANDROID_HOME=$HOME/android-sdk
export ANDROID_SDK_ROOT=$HOME/android-sdk
export BUN_INSTALL="$HOME/.bun"
export DENO_INSTALL="$HOME/.deno"
export PYENV_ROOT="$HOME/.pyenv"
export LDFLAGS="-L/opt/homebrew/opt/llvm/lib"
export CPPFLAGS="-I/opt/homebrew/opt/llvm/include"
# secrets sourced from ~/.zsh_secrets (git-ignored); see zsh/.zsh_secrets.example

# Optimized PATH construction
path=(
    ~/.deno/bin
    ~/.bun/bin
    /opt/homebrew/opt/llvm/bin
    /opt/homebrew/opt/openjdk/bin
    ~/.local/bin
    ~/.pyenv/bin
    ~/.rd/bin
    /shims
    /opt/homebrew/opt/tcl-tk/bin
    ~/.cargo/bin
    /usr/local/bin
    /usr/bin
    /bin
    /usr/sbin
    /sbin
    "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/"
    /opt/homebrew/opt/gcc/bin
    /var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin
    /var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin
    /var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin
    /Library/Apple/usr/bin
    /Library/TeX/texbin
    /Applications/Ghostty.app/Contents/MacOS
    ~/.orbstack/bin
    ~/android-sdk/tools
    ~/android-sdk/platform-tools
    ~/android-sdk/cmdline-tools/7.0/bin
    ~/.spicetify
    ~/Documents/Github/bin
    ~/.maestro/bin
    ~/Downloads/premake-5.0.0-beta2-macosx
    ~/Downloads/ghidra_11.0_PUBLIC/
    ~/.rvm/bin
    /opt/homebrew/bin
    /opt/homebrew/sbin
    $path
)
export PATH

# Node version manager: fnm
eval "$(fnm env --shell zsh --use-on-cd)"

# Lazy load conda
conda() {
  unset -f conda
  __conda_setup="$('/opt/anaconda3/bin/conda' 'shell.zsh' 'hook' 2> /dev/null)"
  if [ $? -eq 0 ]; then
      eval "$__conda_setup"
  else
      if [ -f "/opt/anaconda3/etc/profile.d/conda.sh" ]; then
          . "/opt/anaconda3/etc/profile.d/conda.sh"
      else
          export PATH="/opt/anaconda3/bin:$PATH"
      fi
  fi
  unset __conda_setup
  conda "$@"
}

# Lazy load SDKMAN
sdk() {
  unset -f sdk
  export SDKMAN_DIR="$HOME/.sdkman"
  [[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]] && source "$HOME/.sdkman/bin/sdkman-init.sh"
  sdk "$@"
}

# Source essential configs only
[ -s "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

# Conditional sourcing for performance
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

# Aliases
alias tailscale="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
alias msfconsole="/opt/metasploit-framework/bin/msfconsole"

# Code editor logic (optimized)
if command -v code-insiders &> /dev/null; then
  alias code="code-insiders"
fi

function code() {
  command code "$@"
}

# Pyenv
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init - zsh)"

# Secrets (API keys) live outside the repo, in ~/.zsh_secrets
[ -f "$HOME/.zsh_secrets" ] && source "$HOME/.zsh_secrets"

# Move resource-intensive commands to the end
fastfetch



# Added by Antigravity
export PATH="$HOME/.antigravity/antigravity/bin:$PATH"
export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home

export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools

# opencode
export PATH=$HOME/.opencode/bin:$PATH

# flashlight
export PATH="$HOME/.flashlight/bin:$PATH"

# maestro-runner
export PATH="$HOME/.maestro-runner/bin:$PATH"
export PI_NO_KITTY_PLACEHOLDERS=1
export VEYRA_SIGN_IDENTITY="Apple Development: Ricards Kasendu (W3G22P8L8Q)"

# added by the sdoc installer
export PATH="$HOME/.sdocs/bin:$PATH"
