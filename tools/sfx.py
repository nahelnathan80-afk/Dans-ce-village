#!/usr/bin/env python3
"""Synthétise bruitages et musique (100 % générés → libres de droits).

Usage : python3 tools/sfx.py [durée_musique_en_s]
Sorties : public/sfx/*.wav et public/music/village-loop.wav
"""
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
rs = np.random.default_rng(1234)


def t_(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.005, r=0.2, curve=4.0):
    e = np.ones(n)
    na = max(1, int(SR * a))
    e[:na] = np.linspace(0, 1, na)
    e[na:] = np.exp(-np.linspace(0, curve, n - na) * (1 / max(r, 1e-3)) * 0.25)
    return e


def lp(x, f, order=2):
    b, a = butter(order, min(f, SR / 2 - 100) / (SR / 2), btype="low")
    return lfilter(b, a, x)


def hp(x, f, order=2):
    b, a = butter(order, f / (SR / 2), btype="high")
    return lfilter(b, a, x)


def bp(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], btype="band")
    return lfilter(b, a, x)


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return (x / m * peak).astype(np.float32)


def save(name, x, folder="sfx"):
    d = ROOT / "public" / folder
    d.mkdir(parents=True, exist_ok=True)
    sf.write(d / f"{name}.wav", x.astype(np.float32), SR, subtype="PCM_16")
    print(f"  {folder}/{name}.wav  {len(x) / SR:.2f}s")


# ——— Bruitages ———
def pop():
    t = t_(0.14)
    f = 900 * np.exp(-t * 30) + 300
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35)
    return norm(x, 0.8)


def cash():
    """Caisse enregistreuse : clic mécanique + tiroir + « ding » de clochette."""
    n = int(SR * 0.9)
    x = np.zeros(n)
    # clics mécaniques
    for st in (0.0, 0.035, 0.07):
        i = int(st * SR)
        k = int(0.02 * SR)
        x[i:i + k] += hp(rs.standard_normal(k), 2000) * np.exp(-np.linspace(0, 8, k)) * 0.5
    # tiroir (bruit grave)
    i = int(0.09 * SR)
    k = int(0.12 * SR)
    x[i:i + k] += lp(rs.standard_normal(k), 900) * np.exp(-np.linspace(0, 5, k)) * 0.6
    # ding
    t = t_(0.8)
    ding = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((2093, 1), (4186, 0.35), (5274, 0.25), (3136, 0.3)))
    ding *= np.exp(-t * 5)
    i = int(0.1 * SR)
    x[i:i + len(ding)] += ding[: n - i] * 0.7
    return norm(x, 0.85)


def bell():
    """Cloche d'église : partiels inharmoniques, longue résonance."""
    t = t_(3.2)
    f0 = 220
    parts = ((0.5, 0.6, 1.2), (1, 1, 1.6), (1.19, 0.5, 2.2), (1.5, 0.45, 2.6), (2, 0.4, 3.2), (2.51, 0.25, 4), (3.01, 0.2, 5))
    x = sum(a * np.sin(2 * np.pi * f0 * r * t + rs.random() * 6) * np.exp(-t * d) for r, a, d in parts)
    x[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
    x += lp(rs.standard_normal(len(t)), 3000) * np.exp(-t * 60) * 0.5
    return norm(x, 0.9)


def whoosh(d=0.45, rev=False):
    n = int(SR * d)
    noise = rs.standard_normal(n)
    out = np.zeros(n)
    seg = 512
    for i in range(0, n, seg):
        p = i / n
        fc = 300 + 4000 * np.sin(np.pi * p) ** 2
        out[i:i + seg] = bp(noise[max(0, i - 2048):i + seg], fc * 0.6, fc * 1.4)[-len(noise[i:i + seg]):]
    out *= np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    return norm(out[::-1] if rev else out, 0.7)


def boom():
    t = t_(2.5)
    f = 110 * np.exp(-t * 3) + 32
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.8)
    noise = lp(rs.standard_normal(len(t)), 1200) * np.exp(-t * 2.2)
    crack = hp(rs.standard_normal(len(t)), 1500) * np.exp(-t * 25)
    x = sub * 1.0 + noise * 0.8 + crack * 0.4
    return norm(np.tanh(x * 2.2), 0.95)


def ding():
    t = t_(1.2)
    x = (np.sin(2 * np.pi * 1568 * t) + 0.4 * np.sin(2 * np.pi * 3136 * t) + 0.2 * np.sin(2 * np.pi * 4704 * t)) * np.exp(-t * 4)
    x2 = (np.sin(2 * np.pi * 2093 * t)) * np.exp(-t * 4)
    k = int(0.09 * SR)
    out = np.zeros(len(t) + k)
    out[: len(t)] += x
    out[k:] += x2 * 0.8
    return norm(out, 0.7)


def rewind():
    t = t_(0.8)
    f = 300 + 2600 * t / 0.8
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3
    x += np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.3
    x = lp(x, 5000) * np.sin(np.pi * np.linspace(0, 1, len(t)))
    x += hp(rs.standard_normal(len(t)), 3000) * 0.1
    return norm(x, 0.6)


def rumble(d=2.0):
    t = t_(d)
    x = lp(rs.standard_normal(len(t)), 160, 4) * (1 + 0.6 * np.sin(2 * np.pi * 9 * t))
    x += np.sin(2 * np.pi * 55 * t) * 0.3 * (1 + 0.5 * np.sin(2 * np.pi * 13 * t))
    x *= np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3)
    return norm(x, 0.8)


def alarm(d=2.0):
    t = t_(d)
    f = np.where((t * 4) % 1 < 0.5, 880, 660)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5
    x = lp(x, 3000) * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.1)
    return norm(x, 0.5)


def thud():
    t = t_(0.5)
    x = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t * 12) + 45) / SR) * np.exp(-t * 9)
    x += lp(rs.standard_normal(len(t)), 600) * np.exp(-t * 30) * 0.6
    return norm(x, 0.9)


def click():
    n = int(SR * 0.05)
    x = hp(rs.standard_normal(n), 2500) * np.exp(-np.linspace(0, 12, n))
    t = t_(0.05)
    x += np.sin(2 * np.pi * 2500 * t) * np.exp(-t * 120) * 0.5
    return norm(x, 0.6)


def splash():
    t = t_(0.5)
    x = bp(rs.standard_normal(len(t)), 500, 5000) * np.exp(-t * 7)
    return norm(x, 0.6)


def gasp():
    """« Ohhh » de foule synthétique (bruit formanté)."""
    t = t_(1.2)
    src = rs.standard_normal(len(t))
    x = bp(src, 400, 800) + 0.6 * bp(src, 900, 1300)
    x *= np.sin(np.pi * np.minimum(1, t / 1.2)) ** 0.8
    return norm(x, 0.5)


# ——— Musique : petite boucle « ukulélé + basse + shaker », 112 BPM ———
def pluck(freq, d, bright=0.5):
    """Karplus-Strong (son de corde pincée)."""
    n = int(SR * d)
    p = int(SR / freq)
    buf = rs.uniform(-1, 1, p)
    buf = lp(buf, 2000 + bright * 6000)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return out


def music(total):
    bpm = 112
    beat = 60 / bpm
    bars = int(np.ceil(total / (beat * 4))) + 1
    n = int(SR * bars * beat * 4) + SR * 2
    out = np.zeros(n)
    notes = {'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.0, 'A': 440.0, 'B': 493.88}
    chords = [('C', 'E', 'G'), ('G', 'B', 'D'), ('A', 'C', 'E'), ('F', 'A', 'C')]
    roots = [130.81, 98.0, 110.0, 87.31]
    cache = {}

    def get(f, d, b=0.5):
        k = (round(f, 2), d, b)
        if k not in cache:
            cache[k] = pluck(f, d, b)
        return cache[k]

    strum = [0, 1, 1, 0, 1, 1, 0, 1]  # rythme ukulélé en croches
    melody = ['E', 'G', 'A', 'G', 'E', 'D', 'C', 'D', 'E', 'E', 'D', 'C', 'A', 'C', 'D', 'E']
    for bar in range(bars):
        ci = bar % 4
        ch = chords[ci]
        t0 = bar * 4 * beat
        for e in range(8):
            if not strum[e] and e != 0:
                continue
            st = t0 + e * beat / 2
            for k, nm in enumerate(ch):
                f = notes[nm] * (2 if nm in ('C', 'D') and k > 0 else 1)
                s = get(f, 0.6, 0.4)
                i = int((st + k * 0.012) * SR)
                out[i:i + len(s)] += s * (0.22 if e == 0 else 0.15)
        # basse
        for b in (0, 2):
            s = np.sin(2 * np.pi * roots[ci] * t_(beat * 1.6)) * env(int(SR * beat * 1.6), 0.01, 1.0)
            i = int((t0 + b * beat) * SR)
            out[i:i + len(s)] += s * 0.35
        # petite mélodie « sifflée » une mesure sur deux
        if bar % 8 >= 4:
            for q in range(4):
                nm = melody[(bar * 4 + q) % len(melody)]
                d = beat * 0.9
                tt = t_(d)
                s = np.sin(2 * np.pi * notes[nm] * 2 * tt + 0.004 * np.sin(2 * np.pi * 6 * tt) * 40) * env(len(tt), 0.03, 0.8)
                i = int((t0 + q * beat) * SR)
                out[i:i + len(s)] += s * 0.08
        # percussions : kick léger + shaker + clap
        for b in range(4):
            i = int((t0 + b * beat) * SR)
            if b in (0, 2):
                k = np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t_(0.25) * 20) + 45) / SR) * np.exp(-t_(0.25) * 14)
                out[i:i + len(k)] += k * 0.4
            if b in (1, 3):
                cl = bp(rs.standard_normal(int(SR * 0.12)), 900, 3500) * np.exp(-np.linspace(0, 9, int(SR * 0.12)))
                out[i:i + len(cl)] += cl * 0.18
            for h in range(2):
                j = int((t0 + b * beat + h * beat / 2) * SR)
                sh = hp(rs.standard_normal(int(SR * 0.06)), 6000) * np.exp(-np.linspace(0, 7, int(SR * 0.06)))
                out[j:j + len(sh)] += sh * (0.09 if h else 0.05)
    out = out[: int(SR * total)]
    fade = int(SR * 1.5)
    out[-fade:] *= np.linspace(1, 0, fade)
    return norm(np.tanh(out * 1.3), 0.85)


# ——— Ép. 03 : tension / retournement ———
def heartbeat():
    """Un battement « lub-dub »."""
    out = np.zeros(int(SR * 0.7))
    for st, f0, a in ((0.0, 62, 1.0), (0.18, 55, 0.7)):
        t = t_(0.25)
        x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.6 * np.exp(-t * 30))) / SR) * np.exp(-t * 18) * a
        i = int(st * SR)
        out[i:i + len(x)] += x
    return norm(lp(out, 400), 0.95)


def tick():
    n = int(SR * 0.06)
    x = hp(rs.standard_normal(n), 3000) * np.exp(-np.linspace(0, 14, n))
    t = t_(0.06)
    x += np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 90) * 0.6
    return norm(x, 0.5)


def impact():
    t = t_(1.6)
    x = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t * 2) + 30) / SR) * np.exp(-t * 2.5)
    x += lp(rs.standard_normal(len(t)), 300) * np.exp(-t * 6) * 0.6
    return norm(np.tanh(x * 2), 0.95)


def piano_note(f, d=2.5, v=1.0):
    t = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.2 + k * 0.9)) for k, a in ((1, 1), (2, 0.45), (3, 0.2), (4, 0.1)))
    x *= np.minimum(1, t / 0.004)
    return x * v


def piano_cue():
    """Trois notes douces (indice)."""
    out = np.zeros(int(SR * 3))
    for i, f in enumerate((659.25, 783.99, 987.77)):
        n = piano_note(f, 2.4, 0.5)
        j = int(i * 0.28 * SR)
        out[j:j + len(n)] += n[: len(out) - j]
    return norm(out, 0.6)


def tension(total):
    """Drone grave + pulsation qui accélère + tic-tac, intensité croissante."""
    t = t_(total)
    prog = t / total
    drone = np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.4 * t + 0.3) + 0.3 * np.sin(2 * np.pi * 110 * t)
    drone *= 0.35 + 0.4 * prog
    noise = lp(rs.standard_normal(len(t)), 500) * 0.15 * prog
    out = drone + noise
    # pulsation (kick sourd) : 70 → 128 bpm
    beat_t = 0.0
    while beat_t < total:
        bpm = 70 + 58 * (beat_t / total) ** 1.5
        k = np.sin(2 * np.pi * np.cumsum(80 * np.exp(-t_(0.3) * 18) + 40) / SR) * np.exp(-t_(0.3) * 10)
        i = int(beat_t * SR)
        out[i:i + len(k)] += k[: len(out) - i] * (0.5 + 0.5 * beat_t / total)
        beat_t += 60 / bpm
    # tic-tac régulier
    tk = tick()
    for j in range(int(total * 2)):
        i = int(j * 0.5 * SR)
        out[i:i + len(tk)] += tk[: len(out) - i] * 0.25
    # nappe aiguë qui monte (cordes synthétiques)
    f = 220 * (1 + prog * 0.5)
    pad = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.12 * prog ** 2
    out += pad
    fade = int(SR * 0.05)
    out[-fade:] *= np.linspace(1, 0, fade)
    return norm(np.tanh(out * 1.2), 0.85)


def piano_music(total):
    """Piano doux et chaleureux : arpèges Do – La m – Fa – Sol."""
    chords = [(261.63, 329.63, 392.0), (220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (196.0, 246.94, 293.66)]
    out = np.zeros(int(SR * (total + 3)))
    step = 0.42
    i = 0
    tt = 0.0
    while tt < total:
        ch = chords[(i // 8) % 4]
        f = ch[i % 3] * (2 if i % 8 >= 6 else 1)
        n = piano_note(f, 2.6, 0.55)
        j = int(tt * SR)
        out[j:j + len(n)] += n[: len(out) - j]
        if i % 8 == 0:
            b = piano_note(ch[0] / 2, 3.2, 0.6)
            out[j:j + len(b)] += b[: len(out) - j]
        i += 1
        tt += step
    out = out[: int(SR * total)]
    out[: int(SR * 0.8)] *= np.linspace(0, 1, int(SR * 0.8))
    out[-int(SR * 2):] *= np.linspace(1, 0, int(SR * 2))
    return norm(out, 0.8)


def main_ep03():
    for name, fn in [("heartbeat", heartbeat), ("tick", tick), ("impact", impact), ("piano-cue", piano_cue)]:
        save(name, fn())
    save("tension", tension(100), folder="music")
    save("piano-doux", piano_music(40), folder="music")


def main():
    total = float(sys.argv[1]) if len(sys.argv) > 1 else 95
    for name, fn in [("pop", pop), ("cash", cash), ("bell", bell), ("whoosh", whoosh), ("boom", boom), ("ding", ding),
                     ("rewind", rewind), ("rumble", rumble), ("alarm", alarm), ("thud", thud), ("click", click),
                     ("splash", splash), ("gasp", gasp)]:
        save(name, fn())
    save("village-loop", music(total), folder="music")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "ep03":
        main_ep03()
    else:
        main()
