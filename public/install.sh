#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${HERMESOS_REPO_URL:-https://github.com/jaybirdiestellium-collab/HermesOS-.git}"
INSTALL_DIR="${HERMESOS_INSTALL_DIR:-$HOME/HermesOS}"
BRANCH="${HERMESOS_BRANCH:-}"

log() {
  printf '[hermes-installer] %s\n' "$1"
}

fail() {
  printf '[hermes-installer] Error: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

check_node_version() {
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [ "$major" -lt 18 ]; then
    fail "Node.js 18 or newer is required"
  fi
}

clone_repo() {
  local clone_args=("--depth" "1")
  if [ -n "$BRANCH" ]; then
    clone_args+=("--branch" "$BRANCH")
  fi

  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone "${clone_args[@]}" "$REPO_URL" "$INSTALL_DIR"
}

update_repo() {
  local branch_to_use
  branch_to_use="${BRANCH:-$(git -C "$INSTALL_DIR" rev-parse --abbrev-ref HEAD)}"

  log "Updating existing HermesOS checkout in $INSTALL_DIR"
  git -C "$INSTALL_DIR" fetch --depth 1 origin "$branch_to_use"
  git -C "$INSTALL_DIR" checkout "$branch_to_use"
  git -C "$INSTALL_DIR" pull --ff-only origin "$branch_to_use"
}

write_env_file() {
  if [ -f "$INSTALL_DIR/.env.local" ]; then
    return
  fi

  cat > "$INSTALL_DIR/.env.local" <<'EOF'
# Set your Gemini API key before running HermesOS locally.
GEMINI_API_KEY=
EOF
}

main() {
  require_command git
  require_command node
  require_command npm
  check_node_version

  if [ -d "$INSTALL_DIR/.git" ]; then
    update_repo
  elif [ -e "$INSTALL_DIR" ] && [ -n "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
    fail "Install directory already exists and is not an empty git checkout: $INSTALL_DIR"
  else
    log "Cloning HermesOS into $INSTALL_DIR"
    clone_repo
  fi

  log "Installing npm dependencies"
  npm --prefix "$INSTALL_DIR" install

  write_env_file

  log "HermesOS is ready."
  printf '\nNext steps:\n'
  printf '  cd %s\n' "$INSTALL_DIR"
  printf '  Edit .env.local and set GEMINI_API_KEY\n'
  printf '  npm run dev\n'
}

main "$@"
