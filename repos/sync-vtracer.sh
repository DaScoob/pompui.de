#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/DaScoob/vtracer.git"
BRANCH="pompui"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/vtracer"

if [[ ! -d "$TARGET/.git" ]]; then
  if [[ -e "$TARGET" ]] && [[ -n "$(find "$TARGET" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
    echo "Abbruch: $TARGET existiert, ist aber kein Git-Checkout und nicht leer." >&2
    exit 1
  fi
  rm -rf "$TARGET"
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$TARGET"
  exit 0
fi

CURRENT_URL="$(git -C "$TARGET" remote get-url origin 2>/dev/null || true)"
if [[ "$CURRENT_URL" != "$REPO_URL" ]]; then
  git -C "$TARGET" remote set-url origin "$REPO_URL"
fi

git -C "$TARGET" fetch origin "$BRANCH"

if git -C "$TARGET" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git -C "$TARGET" switch "$BRANCH"
else
  git -C "$TARGET" switch --track -c "$BRANCH" "origin/$BRANCH"
fi

git -C "$TARGET" merge --ff-only "origin/$BRANCH"

echo "VTracer synchron: $(git -C "$TARGET" rev-parse --short HEAD) ($BRANCH)"
