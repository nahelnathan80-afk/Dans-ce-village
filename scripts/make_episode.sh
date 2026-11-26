#!/usr/bin/env bash
# =============================================================================
#  ./scripts/make_episode.sh <nom> [apercu|final] [--plans plan01,plan02] [--controle] [--no-push]
#
#  Fabrique output/<nom>/<nom>.mp4 depuis episodes/<nom>/ puis, si tout s'est
#  bien passé, commit + push du MP4 (< 100 Mo) pour le télécharger sur iPad.
#  Les rendus intermédiaires (cache/) ne sont jamais commités.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
VENV="${DCV_VENV:-/opt/dcv-venv}"

if [ $# -lt 1 ]; then
  echo "Usage : $0 <nom_episode> [apercu|final] [--plans plan01,plan02] [--controle] [--no-push]"
  exit 1
fi
NOM="$1"; shift
MODE="apercu"
if [ $# -gt 0 ] && [[ "$1" != --* ]]; then MODE="$1"; shift; fi
PUSH=1
ARGS=()
for a in "$@"; do
  case "$a" in
    --no-push) PUSH=0 ;;
    --controle) ARGS+=("$a"); PUSH=0 ;;
    --plans*) ARGS+=("$a"); PUSH=0 ;;
    *) ARGS+=("$a") ;;
  esac
done

# Environnement présent ? Sinon on l'installe (nouvelle session cloud).
if [ ! -x "$VENV/bin/python" ] || ! "$VENV/bin/python" -c "import bpy" 2>/dev/null; then
  ./scripts/setup.sh
fi
[ -f musique/theme_par_defaut.mp3 ] || "$VENV/bin/python" tools/make_music.py

PYTHONPATH="$ROOT/src" "$VENV/bin/python" -m dcv.build "$NOM" "$MODE" "${ARGS[@]}"

OUT="output/$NOM/$NOM.mp4"
if [ "$PUSH" = 1 ] && [ -f "$OUT" ]; then
  SIZE=$(stat -c %s "$OUT")
  if [ "$SIZE" -gt 99000000 ]; then
    echo "⚠ $OUT fait plus de 99 Mo : pas de push (limite GitHub)."
    exit 0
  fi
  git add "$OUT" "output/$NOM/rapport_$MODE.txt" "episodes/$NOM" 2>/dev/null || true
  if ! git diff --cached --quiet; then
    git commit -q -m "Vidéo $NOM ($MODE)"
    BR=$(git rev-parse --abbrev-ref HEAD)
    for i in 1 2 3 4; do
      git push -q -u origin "$BR" && break
      sleep $((2 ** i))
    done
    echo "✔ Vidéo poussée sur GitHub (branche $BR) : $OUT"
  fi
fi
