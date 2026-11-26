"""Bande son : voix off calée plan par plan + musique + normalisation.

- La musique (episodes/<nom>/musique.mp3, sinon musique/theme_par_defaut.mp3)
  tourne en boucle sous TOUTE la vidéo : jamais de silence total.
- Ducking : elle baisse automatiquement quand la voix parle.
- Plan "baisse" : musique plus discrète ; plan "coupe" : arrêt net au début
  du plan, puis reprise en fondu (1,5 s) au plan suivant.
- Mixage en numpy (précis et lisible), puis normalisation loudnorm en deux
  passes à -14 LUFS (recommandation TikTok), crête à -1,5 dBTP.
"""
import json
import subprocess
from pathlib import Path

import numpy as np

from . import config

SR = 48000
MUSIQUE_NORMAL = 0.30     # niveau de la musique seule (avant normalisation)
MUSIQUE_BAISSE = 0.13
DUCK = 0.62               # réduction de la musique pendant la voix (62 %)
REPRISE = 1.5             # fondu de reprise après une coupe (s)


def decode(path, dur=None):
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def write_wav(path, a):
    a = np.clip(a, -1, 1)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-ac", "2", str(path)], input=a.astype(np.float32).tobytes(), check=True)


def _envelope(x, win=0.05):
    n = int(SR * win)
    pad = len(x) % n
    y = np.abs(np.concatenate([x, np.zeros(n - pad if pad else 0, np.float32)])).reshape(-1, n).max(axis=1)
    return np.repeat(y, n)[:len(x)]


def _smooth(env, attack=0.03, release=0.35):
    """Suiveur d'enveloppe attaque/relâche (échantillonné par blocs de 10 ms)."""
    step = int(SR * 0.01)
    e = env[::step]
    out = np.zeros_like(e)
    a_c = np.exp(-0.01 / attack)
    r_c = np.exp(-0.01 / release)
    v = 0.0
    for i, x in enumerate(e):
        c = a_c if x > v else r_c
        v = c * v + (1 - c) * x
        out[i] = v
    return np.repeat(out, step)[:len(env)]


def mix(specs, total, musique_path, out_wav, plans):
    N = int(total * SR) + SR
    voice = np.zeros(N, np.float32)
    for s in specs:
        if s["voix_mp3"]:
            v = decode(s["voix_mp3"])
            i0 = int((s["debut"] + config.VOIX_DEBUT) * SR)
            v = v[:max(0, N - i0)]
            voice[i0:i0 + len(v)] += v
    # musique en boucle
    m = decode(musique_path)
    if len(m) == 0:
        m = np.zeros(SR, np.float32)
    reps = int(np.ceil(N / len(m)))
    music = np.tile(m, reps)[:N]
    music = music / (np.max(np.abs(music)) + 1e-6)
    # niveau de base selon les plans (normal / baisse / coupe + reprise)
    t = np.arange(N) / SR
    level = np.full(N, MUSIQUE_NORMAL, np.float32)
    for k, (s, p) in enumerate(zip(specs, plans)):
        a, b = int(s["debut"] * SR), int((s["debut"] + s["duree"]) * SR)
        if p["musique"] == "baisse":
            level[a:b] = MUSIQUE_BAISSE
        elif p["musique"] == "coupe":
            level[a:b] = 0.0
            # reprise douce au plan suivant
            r = int(REPRISE * SR)
            ramp = np.linspace(0, 1, r, dtype=np.float32) ** 1.5
            e = min(N, b + r)
            level[b:e] = np.minimum(level[b:e], MUSIQUE_NORMAL * ramp[:e - b] / 1.0)
    # petits fondus pour éviter les clics de la coupe nette (10 ms)
    level = np.convolve(level, np.ones(480, np.float32) / 480, mode="same")
    # ducking : la musique baisse quand la voix parle
    env = _smooth(_envelope(voice))
    duck = 1.0 - DUCK * np.clip(env / 0.12, 0, 1)
    # entrée et sortie de la vidéo
    fade_in = np.clip(t / 0.4, 0, 1)
    fade_out = np.clip((total - t) / 1.5, 0, 1)
    out = voice * 0.95 + music * level * duck * fade_in * fade_out
    write_wav(out_wav, out[:int(total * SR)])
    # contrôle « jamais de silence total » (hors plan « coupe » voulu)
    rms = np.sqrt(np.convolve(out[:int(total * SR)] ** 2, np.ones(SR // 2) / (SR // 2), mode="valid"))
    return float(rms.min()), music * level * duck


def loudnorm(in_wav, out_m4a, target=-14.0):
    """Normalisation EBU R128 en deux passes (mesure puis correction)."""
    p1 = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(in_wav), "-af",
                         f"loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                        capture_output=True, text=True)
    txt = p1.stderr
    js = json.loads(txt[txt.rindex("{"):txt.rindex("}") + 1])
    af = (f"loudnorm=I={target}:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
          f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(in_wav), "-af", af, "-ar", "48000",
                    "-c:a", "aac", "-b:a", "192k", str(out_m4a)], check=True)
    return js


def measure_lufs(path):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    txt = p.stderr
    return float(json.loads(txt[txt.rindex("{"):txt.rindex("}") + 1])["input_i"])
