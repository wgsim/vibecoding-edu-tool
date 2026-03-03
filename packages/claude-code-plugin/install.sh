#!/usr/bin/env bash
# install.sh — Install or update the vibecoding-edu Claude Code plugin
#
# Supports two scenarios:
#   1. Local clone:  bash packages/claude-code-plugin/install.sh
#   2. After GitHub clone: same command (run in a regular terminal, not inside a Claude session)
#
set -euo pipefail

PLUGIN_NAME="vibecoding-edu"
MARKETPLACE="vibecoding-edu"
PLUGIN_KEY="${PLUGIN_NAME}@${MARKETPLACE}"
VERSION="0.1.0"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE_DIR="$HOME/.claude/plugins/cache/${MARKETPLACE}/${PLUGIN_NAME}/${VERSION}"
MKT_DIR="$HOME/.claude/plugins/marketplaces/${MARKETPLACE}/plugins/${PLUGIN_NAME}"
INSTALLED_PLUGINS="$HOME/.claude/plugins/installed_plugins.json"
SETTINGS="$HOME/.claude/settings.json"

echo "🔧 Installing ${PLUGIN_KEY} v${VERSION}"
echo ""

# ── 1. Sync plugin files to global cache ──────────────────────────────────────
echo "→ Copying plugin files to global cache..."
mkdir -p "${CACHE_DIR}"
cp -r "${SCRIPT_DIR}/.claude-plugin" "${CACHE_DIR}/"
cp -r "${SCRIPT_DIR}/skills"         "${CACHE_DIR}/"
echo "  ✔ ${CACHE_DIR}"

# ── 2. Sync plugin files to local marketplace ─────────────────────────────────
echo "→ Syncing to local marketplace..."
mkdir -p "${MKT_DIR}"
cp -r "${SCRIPT_DIR}/.claude-plugin" "${MKT_DIR}/"
cp -r "${SCRIPT_DIR}/skills"         "${MKT_DIR}/"
echo "  ✔ ${MKT_DIR}"

# ── 3. Register in installed_plugins.json ─────────────────────────────────────
echo "→ Registering in installed_plugins.json..."
python3 - <<PYEOF
import json, os, datetime

path = os.path.expanduser("${INSTALLED_PLUGINS}")
key  = "${PLUGIN_KEY}"

try:
    with open(path) as f:
        d = json.load(f)
except FileNotFoundError:
    d = {"version": 2, "plugins": {}}

now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
entry = {
    "scope":       "user",
    "installPath": os.path.expanduser("${CACHE_DIR}"),
    "version":     "${VERSION}",
    "installedAt": now,
    "lastUpdated": now,
}

existing = d["plugins"].get(key, [])
if existing:
    entry["installedAt"] = existing[0].get("installedAt", now)
    existing[0] = entry
    d["plugins"][key] = existing
else:
    d["plugins"][key] = [entry]

# Remove stale entries from other marketplaces (e.g. @claude-private-plugins)
for stale_key in [k for k in d["plugins"] if k.startswith("${PLUGIN_NAME}@") and k != key]:
    del d["plugins"][stale_key]
    print(f"  ✗ removed stale entry: {stale_key}")

with open(path, "w") as f:
    json.dump(d, f, indent=2)

print(f"  ✔ {key}")
PYEOF

# ── 4. Enable in settings.json ────────────────────────────────────────────────
echo "→ Enabling in settings.json..."
python3 - <<PYEOF
import json, os

path = os.path.expanduser("${SETTINGS}")
key  = "${PLUGIN_KEY}"

try:
    with open(path) as f:
        d = json.load(f)
except FileNotFoundError:
    d = {}

d.setdefault("enabledPlugins", {})[key] = True

# Remove stale keys for this plugin
for stale in [k for k in d["enabledPlugins"] if k.startswith("${PLUGIN_NAME}@") and k != key]:
    del d["enabledPlugins"][stale]
    print(f"  ✗ removed stale key: {stale}")

with open(path, "w") as f:
    json.dump(d, f, indent=2)

print(f"  ✔ enabled: {key}")
PYEOF

echo ""
echo "✅ Done. Open a new Claude Code session to load the skills."
echo ""
echo "   Available skills:"
echo "   /vibecoding-edu:xray     — Explain AI-generated code line-by-line"
echo "   /vibecoding-edu:dojo     — Debugging challenge from recent code"
echo "   /vibecoding-edu:analyze  — AI session history analysis"
