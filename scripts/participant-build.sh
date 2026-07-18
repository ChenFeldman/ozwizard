#!/usr/bin/env bash
# Produce a clean "participant" copy of OzWizard with facilitator-only materials
# removed (the planted-issue answer key and METHOD_* IP prose).
#
# Usage: bash scripts/participant-build.sh [output-dir]   (default: participant-build)
set -euo pipefail

OUT="${1:-participant-build}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building participant copy -> $OUT"
rm -rf "$ROOT/$OUT"
mkdir -p "$ROOT/$OUT"

# Copy the working tree, excluding heavy/build/vcs dirs and the output itself.
tar \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='./web/node_modules' \
  --exclude='./dist' \
  --exclude='./web/dist' \
  --exclude='./data' \
  --exclude='./coverage' \
  --exclude='./playwright-report' \
  --exclude='./test-results' \
  --exclude="./$OUT" \
  -C "$ROOT" -cf - . | tar -C "$ROOT/$OUT" -xf -

# Strip facilitator-only materials.
rm -f "$ROOT/$OUT/docs/PLANTED.md"
rm -f "$ROOT/$OUT"/docs/METHOD_*.md

# Give the participant copy a .gitignore that also refuses the answer key, so a
# re-init can't accidentally commit it.
cat > "$ROOT/$OUT/.gitignore" <<'EOF'
node_modules
dist
coverage
data
*.log
.env
.DS_Store
web/dist
playwright-report
test-results
participant-build

# Facilitator-only — never ship to participants
docs/PLANTED.md
docs/METHOD_*.md
EOF

echo "Done. Facilitator files removed:"
echo "  - docs/PLANTED.md"
echo "  - docs/METHOD_*.md"
echo "Participant copy at: $OUT"
