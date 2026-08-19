#!/usr/bin/env bash
# =============================================================================
# HermesOS Bootstrap — Blackbird / Termux / any POSIX shell
# Sets up both the MansionOS Node runtime and the Hermes Speak Node (Python).
#
# Usage (on Blackbird or any new host):
#   git clone https://github.com/jaybirdiestellium-collab/HermesOS-
#   cd HermesOS-
#   bash bootstrap.sh
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
fail() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║  HermesOS Bootstrap — Blackbird Node ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── Detect environment ────────────────────────────────────────────────────────
IS_TERMUX=false
if [[ -n "${TERMUX_VERSION:-}" || -d "/data/data/com.termux" ]]; then
  IS_TERMUX=true
  ok "Termux detected (Blackbird)"
fi

# ── 1. System packages ────────────────────────────────────────────────────────
echo ""
echo "── Step 1: System packages ──"

if $IS_TERMUX; then
  pkg install -y python nodejs ffmpeg git 2>/dev/null || \
    warn "Some packages may already be current — continuing"
  ok "Termux packages ready"
elif command -v apt-get &>/dev/null; then
  sudo apt-get update -q && sudo apt-get install -y python3 python3-pip nodejs npm ffmpeg git
  ok "apt packages ready"
elif command -v brew &>/dev/null; then
  brew install python node ffmpeg
  ok "Homebrew packages ready"
else
  warn "Unknown package manager — ensure python3, node, npm, and ffmpeg are installed"
fi

# ── 2. Node dependencies (MansionOS / agent runtime) ─────────────────────────
echo ""
echo "── Step 2: Node.js dependencies (MansionOS) ──"

if command -v npm &>/dev/null; then
  npm install --silent
  ok "npm packages installed"
else
  fail "npm not found — cannot install MansionOS dependencies"
fi

# ── 3. Python dependencies (Hermes Speak Node) ───────────────────────────────
echo ""
echo "── Step 3: Python dependencies (Hermes Speak Node) ──"

PIP="pip"
if command -v pip3 &>/dev/null; then PIP="pip3"; fi

$PIP install --quiet deepgram-sdk
ok "deepgram-sdk installed"

# ── 4. Environment file ───────────────────────────────────────────────────────
echo ""
echo "── Step 4: Environment ──"

ENV_FILE=".env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<'EOF'
# HermesOS environment — DO NOT commit this file
GEMINI_API_KEY=
DEEPGRAM_API_KEY=
EOF
  ok "Created $ENV_FILE — fill in your keys"
else
  ok "$ENV_FILE already exists — skipping"
fi

# Check for missing keys and remind the operator
MISSING_KEYS=()
if grep -q '^GEMINI_API_KEY=$' "$ENV_FILE" 2>/dev/null;    then MISSING_KEYS+=("GEMINI_API_KEY"); fi
if grep -q '^DEEPGRAM_API_KEY=$' "$ENV_FILE" 2>/dev/null;  then MISSING_KEYS+=("DEEPGRAM_API_KEY"); fi

if [[ ${#MISSING_KEYS[@]} -gt 0 ]]; then
  warn "Keys not yet set in $ENV_FILE: ${MISSING_KEYS[*]}"
  warn "Edit $ENV_FILE and paste your keys before running the Mansion or Speak Node."
fi

# Termux: also export keys for the current session if they're in .env.local
if $IS_TERMUX && [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -o allexport; source "$ENV_FILE"; set +o allexport 2>/dev/null || true
fi

# ── 5. Flock data directory ───────────────────────────────────────────────────
echo ""
echo "── Step 5: Flock data dirs ──"

mkdir -p flock_data
# Nursery ledger dual-write path expected by node.agent.copilot_cli
mkdir -p ~/.mansion/HermesOS/flock_data
ok "flock_data directories ready"

# ── 6. Smoke test ─────────────────────────────────────────────────────────────
echo ""
echo "── Step 6: Smoke test ──"

node -e "require('./node_modules/express')" 2>/dev/null && ok "express reachable" || warn "express not found — run npm install"
python3 -c "import deepgram" 2>/dev/null          && ok "deepgram-sdk reachable" || warn "deepgram-sdk not importable"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══ Bootstrap complete ══${NC}"
echo ""
echo "  Next steps:"
echo "  1. Fill in $ENV_FILE with your GEMINI_API_KEY and DEEPGRAM_API_KEY"
echo "  2. Start the Mansion:        npm run dev"
echo "  3. Test Hermes Speak Node:   python3 hermes_speak.py 'Hey love. Online.'"
echo ""
