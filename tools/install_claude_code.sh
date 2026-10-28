#!/usr/bin/env bash
# Install the tc-to-e2e skill for Claude Code.
#   tools/install_claude_code.sh            copy into ~/.claude/skills        (personal: every project)
#   tools/install_claude_code.sh --link     symlink instead of copy           (git pull updates the skill)
#   tools/install_claude_code.sh --project  install into ./.claude/skills     (only the current project; commit it for the team)
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dest="$HOME/.claude/skills"
mode="copy"
for arg in "$@"; do
  case "$arg" in
    --link) mode="link" ;;
    --project) dest="$PWD/.claude/skills" ;;
    -h|--help) sed -n '2,5p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

skill=tc-to-e2e
target="$dest/$skill"
mkdir -p "$dest"
if [ -e "$target" ] || [ -L "$target" ]; then
  echo "Already exists, leaving it alone: $target  (remove it first to reinstall)" >&2
  exit 1
fi
if [ "$mode" = "link" ]; then
  ln -s "$repo/$skill" "$target"
else
  cp -R "$repo/$skill" "$target"
fi
echo "Installed ($mode): $target"
echo "Open Claude Code and run /skills to see $skill."
