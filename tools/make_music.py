"""Génère musique/theme_par_defaut.mp3 : boucle originale de 32 s, synthétisée
en numpy (aucun échantillon externe → libre de droits).
Ambiance « storytime mystérieux » : nappe douce, arpège en pizzicato,
basse ronde, petite rythmique feutrée. 90 BPM, la mineur.

  python tools/make_music.py
"""
import subprocess
from pathlib import Path

import numpy as np

SR = 44100
BPM = 90
BEAT = 60 / BPM
BARS = 12                       # 12 mesures de 4 temps = 32 s
N = int(SR * BARS * 4 * BEAT)
t_all = np.arange(N) / SR


def note(n):                    # n = numéro MIDI
    return 440.0 * 2 ** ((n - 69) / 12)


def env_adsr(n, a=0.01, d=0.2, s=0.6, r=0.3, length=None):
    L = length or n
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    e[na:na + nd] = np.linspace(1, s, nd)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def add(buf, start, sig):
    i = int(start * SR)
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[:j - i]


# Am – F – C – G | Am – F – Dm – E  (+ variantes)
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62],
          [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59],
          [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]]

pad = np.zeros(N)
arp = np.zeros(N)
bass = np.zeros(N)
perc = np.zeros(N)
rng = np.random.default_rng(3)
bar = 4 * BEAT
for b, ch in enumerate(CHORDS):
    t0 = b * bar
    n = int(bar * SR)
    tt = np.arange(n) / SR
    # nappe : trois sinus légèrement désaccordés
    s = sum(np.sin(2 * np.pi * note(m + 12) * tt) + 0.5 * np.sin(2 * np.pi * note(m + 12) * 1.003 * tt) for m in ch)
    add(pad, t0, s * env_adsr(n, 0.6, 0.5, 0.8, 0.6) * 0.06)
    # basse : fondamentale sur les temps 1 et 3
    for k in (0, 2):
        nn = int(BEAT * 1.8 * SR)
        tb = np.arange(nn) / SR
        f = note(ch[0] - 12)
        add(bass, t0 + k * BEAT, (np.sin(2 * np.pi * f * tb) + 0.3 * np.sin(4 * np.pi * f * tb)) * np.exp(-tb * 2.2) * 0.22)
    # arpège pizzicato en croches
    seq = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[1], ch[0] + 12, ch[2]]
    for k, m in enumerate(seq):
        nn = int(0.5 * SR)
        ta = np.arange(nn) / SR
        f = note(m + 12)
        sig = (np.sin(2 * np.pi * f * ta) + 0.25 * np.sin(6 * np.pi * f * ta)) * np.exp(-ta * 9)
        add(arp, t0 + k * BEAT / 2, sig * (0.11 if k % 2 == 0 else 0.07))
    # rythmique feutrée (à partir de la 3e mesure)
    if b >= 2:
        for k in range(4):
            nn = int(0.25 * SR)
            tk = np.arange(nn) / SR
            if k in (0, 2):     # grosse caisse douce
                add(perc, t0 + k * BEAT, np.sin(2 * np.pi * (55 + 60 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 12) * 0.35)
            nh = int(0.06 * SR)  # charleston léger sur les contretemps
            add(perc, t0 + k * BEAT + BEAT / 2, rng.normal(0, 1, nh) * np.exp(-np.arange(nh) / SR * 70) * 0.03)

mix = pad + arp + bass + perc
# fondu de bouclage (100 ms) pour que la boucle soit invisible
f = int(0.1 * SR)
mix[:f] *= np.linspace(0, 1, f)
mix[-f:] *= np.linspace(1, 0, f)
mix /= np.max(np.abs(mix)) * 1.12
out = Path(__file__).resolve().parents[1] / "musique" / "theme_par_defaut.mp3"
out.parent.mkdir(exist_ok=True)
stereo = np.stack([mix, np.roll(mix, int(0.012 * SR)) * 0.95], axis=1).astype(np.float32)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                "-b:a", "192k", str(out)], input=stereo.tobytes(), check=True)
print("écrit :", out)
