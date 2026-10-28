#!/usr/bin/env bash
# Build dist/tc-to-e2e.zip for Claude Desktop / claude.ai (Settings > Capabilities > Skills > Upload skill).
# The zip has the skill folder at its root (tc-to-e2e/SKILL.md), which is the layout Claude expects.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$repo/dist"
rm -f "$repo/dist/tc-to-e2e.zip"
cd "$repo"
zip -qr dist/tc-to-e2e.zip tc-to-e2e -x '*.DS_Store' '*/.env*'
echo "$repo/dist/tc-to-e2e.zip"
