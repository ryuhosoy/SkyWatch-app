#!/bin/bash
# Build iOS preview from a /tmp copy (outside iCloud Desktop).
# Usage (Terminal.app):
#   bash scripts/eas-preview-from-tmp.sh
set -euo pipefail

SRC="/Users/ryuhosoy/Desktop/develop-apps/SkyWatch"
DEST="/tmp/SkyWatch-eas-preview"
REMOTE_URL="https://github.com/ryuhosoy/SkyWatch-app.git"
BRANCH="develop-Android"

echo "== stop note =="
echo "If eas is still spinning in another terminal, press Ctrl+C there first."
echo

echo "== prepare clean copy at $DEST =="
rm -rf "$DEST"
git clone --branch "$BRANCH" --single-branch "$REMOTE_URL" "$DEST"

echo "== sync local changes (keep healthy .git) =="
rsync -a \
  --exclude '.git' \
  --exclude '.git.broken' \
  --exclude 'node_modules' \
  --exclude '.expo' \
  --exclude 'ios' \
  --exclude 'android' \
  --exclude 'marketing' \
  --exclude 'marketing-captures' \
  --exclude '.eas-clone-test' \
  --exclude '.git-relink-tmp' \
  --exclude '.git-repair-tmp' \
  "$SRC/" "$DEST/"

cd "$DEST"
npm install

echo "== sanity =="
git status -sb | head -40
ls -laO node_modules/expo/bin/cli
node ./node_modules/expo/bin/cli config --json --type introspect >/tmp/sky-intro.json
python3 -c 'import json; d=json.load(open("/tmp/sky-intro.json")); print("config_ok", d["name"], d["slug"])'

echo
echo "== start eas build =="
eas build --platform ios --profile preview
