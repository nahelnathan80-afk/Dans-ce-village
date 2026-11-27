"""Génère musique/theme_nuit.mp3 : boucle originale de 32 s pour les épisodes qui font
peur (synthèse numpy, libre de droits). Nappe grave en ré mineur, pulsation lente
comme un cœur, boîte à musique lointaine et désaccordée.

  python tools/make_music_nuit.py
"""
import subprocess
from pathlib import Path

import numpy as np

SR = 44100
DUR = 32.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(9)


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# nappe : quintes graves désaccordées, qui « respirent »
pad = np.zeros(N)
for m, a in ((38, 0.5), (45, 0.35), (50, 0.25), (53, 0.18)):     # ré, la, ré, fa
    f = note(m)
    for det in (0.997, 1.0, 1.004):
        pad += a * np.sin(2 * np.pi * f * det * t + rng.uniform(0, 6))
pad *= 0.5 + 0.5 * np.sin(2 * np.pi * t / 8.0) ** 2
pad *= 0.12
# pulsation sourde (≈ 60 bpm), boum-boum
pulse = np.zeros(N)
for k in range(int(DUR)):
    for off, amp in ((0.0, 1.0), (0.22, 0.6)):
        i = int((k + off) * SR)
        m = int(0.25 * SR)
        tt = np.arange(m) / SR
        seg = np.sin(2 * np.pi * (45 + 25 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 14) * amp
        pulse[i:i + m] += seg[:max(0, N - i)]
pulse *= 0.32
# boîte à musique lointaine (notes rares, légèrement fausses)
box = np.zeros(N)
mel = [74, 77, 76, 72, 74, 69, 70, 69]
for k, m in enumerate(mel * 2):
    st = 1.5 + k * 1.9 + rng.uniform(-0.1, 0.1)
    i = int(st * SR)
    nn = int(1.6 * SR)
    tt = np.arange(nn) / SR
    f = note(m) * 1.006
    seg = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2.76 * f * tt)) * np.exp(-tt * 3.0)
    box[i:i + nn] += seg[:max(0, N - i)] * 0.09
# souffle
air = np.convolve(rng.normal(0, 1, N), np.ones(200) / 200, mode="same") * 0.05
mix = pad + pulse + box + air
f = int(0.1 * SR)
mix[:f] *= np.linspace(0, 1, f)
mix[-f:] *= np.linspace(1, 0, f)
mix /= np.max(np.abs(mix)) * 1.1
out = Path(__file__).resolve().parents[1] / "musique" / "theme_nuit.mp3"
st = np.stack([mix, np.roll(mix, int(0.015 * SR)) * 0.95], axis=1).astype(np.float32)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-b:a", "192k", str(out)],
               input=st.tobytes(), check=True)
print("écrit :", out)
