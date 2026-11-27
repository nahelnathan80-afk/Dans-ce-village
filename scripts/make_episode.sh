#!/usr/bin/env bash
# Fabrique un épisode de bout en bout (moteur v2 : « la voix pilote tout »).
#   ./scripts/make_episode.sh <nom> [apercu|final]
#   ex. ./scripts/make_episode.sh ep05-papa-rapetisse apercu
# Étapes : voix continue + whisper.cpp → liste des cadrages → rendu Remotion → son à -14 LUFS
#          → contrôle du rythme (BLOQUANT : le rendu final échoue si une règle n'est pas respectée).
set -euo pipefail
cd "$(dirname "$0")/.."
NOM="${1:?usage: make_episode.sh <nom> [apercu|final]}"
MODE="${2:-apercu}"
SCEN="episodes/$NOM/scenario.json"
[ -f "$SCEN" ] || { echo "✖ $SCEN introuvable"; exit 1; }
EP=$(python3 -c "import json,sys; print(json.load(open('$SCEN'))['id'])")
COMP="Ep${EP#ep}"
OUT="out/$EP"
mkdir -p "$OUT" rendu

if python3 -c "import json,sys; sys.exit(0 if json.load(open('$SCEN')).get('musique') else 1)"; then
  python3 tools/temp_music.py "$EP" >/dev/null   # musiques temporaires si les vraies manquent
fi
echo "▶ 1/5 voix ($EP)"
if [ "${SKIP_VOICE:-0}" != "1" ]; then python3 tools/voice.py "$EP"; fi

echo "▶ 2/5 cadrages"
npx tsx tools/export_shots.mts "$EP" "$OUT/shots.json"

echo "▶ 3/5 rendu $MODE"
if [ "$MODE" = "final" ]; then
  npx remotion render "$COMP" "$OUT/brut.mp4" --codec=h264 --crf=18 --concurrency="${CONC:-4}" --log=error
else
  npx remotion render "$COMP" "$OUT/brut.mp4" --codec=h264 --scale=0.5 --crf=26 --concurrency="${CONC:-4}" --log=error
fi

echo "▶ 4/5 son final à -14 LUFS"
J=$(ffmpeg -hide_banner -i "$OUT/brut.mp4" -af loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(echo "$J" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
DEST="$OUT/$NOM-$MODE.mp4"
ffmpeg -loglevel error -y -i "$OUT/brut.mp4" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=9:$mi:linear=true,aresample=48000" -c:a aac -b:a 192k -movflags +faststart "$DEST"
LUFS=$(ffmpeg -hide_banner -i "$DEST" -af ebur128 -f null - 2>&1 | grep -E '^\s+I:' | tail -1 | awk '{print $2}')
echo "  intensité finale : $LUFS LUFS"

echo "▶ 5/5 contrôle du rythme (bloquant)"
if python3 scripts/check_rythme.py --voice "public/$EP/voice.wav" --timeline "src/episodes/$EP/timeline.json" \
     --shots "$OUT/shots.json" --video "$DEST" --report "$OUT/rythme-$MODE.md" --title "$NOM ($MODE)"; then
  if [ "$MODE" = "final" ]; then cp "$DEST" "rendu/$NOM.mp4"; echo "✔ rendu final : rendu/$NOM.mp4"; else echo "✔ aperçu : $DEST"; fi
else
  echo "✖ ÉCHEC du contrôle du rythme — voir $OUT/rythme-$MODE.md"
  [ "$MODE" = "final" ] && mv "$DEST" "$DEST.ECHEC"
  exit 1
fi
