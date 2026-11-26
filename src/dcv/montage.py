"""Assemblage final avec FFmpeg.

- les coupes franches entre cadrages d'un même plan sont déjà dans chaque
  clip (la caméra saute d'un preset à l'autre) ;
- fondu court (xfade) entre deux plans : chaque clip est rendu avec
  FONDU secondes en plus à la fin, pour que le plan suivant démarre
  exactement à son heure (la voix reste calée) ;
- fondu au noir final (+ quelques secondes de noir si "fin": {"noir": …}) ;
- sous-titres .ass incrustés (libass) ;
- son AAC normalisé.
"""
import subprocess
from pathlib import Path

from . import config


def assemble(clips, specs, fade, total, ass_path, audio_path, out_mp4, mode):
    W, H = mode["out"]
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]
    inputs += ["-i", str(audio_path)]
    n = len(clips)
    chain = []
    prev = "[0:v]"
    for i in range(1, n):
        off = specs[i]["debut"]
        out = f"[x{i}]"
        chain.append(f"{prev}[{i}:v]xfade=transition=fade:duration={fade:.4f}:offset={off:.4f}{out}")
        prev = out
    last = specs[-1]
    end_content = last["debut"] + last["duree"]
    noir = last.get("noir", 0.0)
    fd = 0.7
    ass = str(ass_path).replace("\\", "/").replace(":", r"\:").replace("'", r"\'")
    chain.append(f"{prev}fade=t=out:st={end_content - fd:.3f}:d={fd},"
                 f"tpad=stop_mode=add:stop_duration={noir + 0.05:.3f}:color=black,"
                 f"trim=duration={total:.3f},ass='{ass}':fontsdir=/usr/share/fonts/opentype/montserrat,"
                 f"format=yuv420p[v]")
    fc = ";".join(chain)
    maxrate = "8M" if W >= 1080 else "3M"
    cmd = ["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", fc, "-map", "[v]", "-map", f"{n}:a",
           "-c:v", "libx264", "-preset", "slow" if W >= 1080 else "medium", "-crf", str(mode["crf"]),
           "-maxrate", maxrate, "-bufsize", "16M", "-profile:v", "high", "-r", str(config.FPS),
           "-c:a", "copy", "-movflags", "+faststart", "-shortest", "-t", f"{total:.3f}", str(out_mp4)]
    subprocess.run(cmd, check=True)
