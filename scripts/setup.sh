#!/usr/bin/env bash
# =============================================================================
#  Dans cette ville — installation de l'environnement (à relancer à chaque
#  nouvelle session cloud : le conteneur repart de zéro).
#
#  Installe :
#    - Blender 5.x sous forme de module Python (« bpy », depuis PyPI)
#    - Mesa (OpenGL/EGL logiciel) pour qu'Eevee rende sans carte graphique
#    - FFmpeg (avec libass pour les sous-titres), espeak-ng
#    - Piper (TTS local gratuit) + une voix française (Hugging Face)
#    - whisper.cpp via pywhispercpp + le modèle « base » (Hugging Face)
#    - Police Montserrat ExtraBold
#
#  Sites utilisés : pypi.org, archive.ubuntu.com, huggingface.co.
#  (github.com et download.blender.org sont bloqués ici : on ne s'en sert pas.)
#
#  Usage : ./scripts/setup.sh        (idempotent : ne refait que ce qui manque)
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
VENV="${DCV_VENV:-/opt/dcv-venv}"
MODELS="$ROOT/.models"          # ignoré par git
mkdir -p "$MODELS"

say() { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }

# --- 1. Paquets système ------------------------------------------------------
NEED_APT=()
command -v ffmpeg     >/dev/null || NEED_APT+=(ffmpeg)
command -v espeak-ng  >/dev/null || NEED_APT+=(espeak-ng)
fc-list | grep -i "Montserrat-ExtraBold" >/dev/null || NEED_APT+=(fonts-montserrat)
ldconfig -p | grep libEGL.so.1 >/dev/null || NEED_APT+=(libegl1 libegl-mesa0 libgl1-mesa-dri)
ldconfig -p | grep libXi.so.6 >/dev/null || NEED_APT+=(libxi6 libxxf86vm1 libxfixes3 libxrender1 libxkbcommon0 libsm6)
if [ ${#NEED_APT[@]} -gt 0 ]; then
  say "apt : ${NEED_APT[*]}"
  SUDO=""; [ "$(id -u)" != 0 ] && SUDO="sudo"
  $SUDO apt-get update -qq || true
  DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -qq "${NEED_APT[@]}"
fi

# --- 2. Environnement Python (Blender exige Python 3.13 pour bpy 5.x) --------
PY=python3.13
command -v $PY >/dev/null || PY=python3
if [ ! -x "$VENV/bin/python" ]; then
  say "Création de l'environnement Python $VENV"
  $PY -m venv "$VENV"
fi
"$VENV/bin/python" -m pip install -q --upgrade pip
say "Modules Python (bpy, pillow, numpy, piper-tts, pywhispercpp)"
"$VENV/bin/python" -m pip install -q "bpy>=5.0,<6" pillow numpy piper-tts pywhispercpp

# --- 3. Voix Piper française (voix temporaire) ------------------------------
HF=https://huggingface.co
for PV in tom/medium/fr_FR-tom-medium upmc/medium/fr_FR-upmc-medium siwis/medium/fr_FR-siwis-medium; do
  PIPER_VOICE=$(basename "$PV")
  if [ ! -f "$MODELS/$PIPER_VOICE.onnx" ]; then
    say "Voix Piper $PIPER_VOICE"
    curl -fsSL -o "$MODELS/$PIPER_VOICE.onnx"      "$HF/rhasspy/piper-voices/resolve/main/fr/fr_FR/$PV.onnx"
    curl -fsSL -o "$MODELS/$PIPER_VOICE.onnx.json" "$HF/rhasspy/piper-voices/resolve/main/fr/fr_FR/$PV.onnx.json"
  fi
done

# --- 4. Modèle whisper.cpp (timing des mots) ---------------------------------
if [ ! -f "$MODELS/ggml-base.bin" ]; then
  say "Modèle whisper.cpp ggml-base"
  curl -fsSL -o "$MODELS/ggml-base.bin" "$HF/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
fi

# --- 5. Vérifications ---------------------------------------------------------
say "Vérification"
"$VENV/bin/python" -c "import bpy; print('Blender', bpy.app.version_string)"
ffmpeg -hide_banner -filters 2>/dev/null | grep " ass " >/dev/null && echo "FFmpeg + libass OK"
fc-list | grep -i "Montserrat-ExtraBold" >/dev/null && echo "Police Montserrat ExtraBold OK"
echo "Prêt. Lance : ./scripts/make_episode.sh leo_hier apercu"
