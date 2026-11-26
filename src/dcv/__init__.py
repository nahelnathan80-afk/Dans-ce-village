"""Dans cette ville — générateur d'épisodes vidéo (Blender + FFmpeg).

Organisation :
  scenario.py   lecture du scenario.json (JSON + commentaires //)
  timing.py     durées des plans, découpage en cadrages
  tts.py        voix (MP3 fourni > ElevenLabs > Piper > espeak-ng)
  align.py      timing mot à mot (whisper.cpp ou répartition proportionnelle)
  build.py      chef d'orchestre (appelé par scripts/make_episode.sh)
Côté Blender (exécuté dans un processus séparé par plan) :
  render_shot.py, scene.py, characters.py, actions.py, camera.py, moods.py,
  crowd.py, props.py, sets/*.py
Côté image/son :
  textures.py, faces.py (PIL), overlay.py (bulles, étiquettes),
  subtitles.py (.ass), audio.py, montage.py, cache.py
"""
