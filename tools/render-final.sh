#!/usr/bin/env bash
# Rendu final robuste : vidéo en 4 morceaux (sans son) + piste audio, puis assemblage H.264/AAC.
# Usage : bash tools/render-final.sh [Ep01] [sortie.mp4]
set -euo pipefail
COMP=${1:-Ep01}
OUT=${2:-rendu/ep01-un-euro-le-mot.mp4}
TMP=out/final-parts
mkdir -p "$TMP" "$(dirname "$OUT")"
TOTAL=$(npx remotion compositions 2>/dev/null | awk -v c="$COMP" '$1==c {print $4}')
echo "Frames : $TOTAL"
N=4
STEP=$(( (TOTAL + N - 1) / N ))
: > "$TMP/list.txt"
for i in $(seq 0 $((N-1))); do
  A=$(( i * STEP )); B=$(( (i+1) * STEP - 1 )); [ $B -ge $TOTAL ] && B=$((TOTAL-1))
  F="$TMP/part$i.mp4"
  echo "part$i : frames $A-$B"
  if [ ! -s "$F" ]; then
    npx remotion render "$COMP" "$F" --frames=$A-$B --muted --codec=h264 --crf=18 --concurrency=4 --log=error
  fi
  echo "file 'part$i.mp4'" >> "$TMP/list.txt"
  echo "PART_DONE $i"
done
npx remotion render "$COMP" "$TMP/audio.aac" --codec=aac --log=error
ffmpeg -loglevel error -y -f concat -safe 0 -i "$TMP/list.txt" -i "$TMP/audio.aac" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
echo "FINAL_OK $OUT"
