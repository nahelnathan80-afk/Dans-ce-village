#!/usr/bin/env python3
"""Musiques TEMPORAIRES (aperçu) + bruitages de l'ép. 06, 100 % synthétisés.

Usage : python3 tools/temp_music.py ep06
  - si episodes/<nom>/musique/originale.mp3, fond_instrumental.mp3 ou chorale_finale.mp3 manquent,
    fabrique une version temporaire dans out/<ep>/temp/ (folk d'automne : guitare, basse, shaker,
    « voix » synthétique qui suit les syllabes) + un fichier .paroles.json (timing des mots chantés) ;
  - bruitages : scratch (vinyle, 0,3 s), pfffuit (citrouille qui se dégonfle), pouf (regonfle), pluie, coassement.
"""
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sfx as S  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SR = S.SR
NOTES = {'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.0, 'A3': 220.0, 'B3': 246.94,
         'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.0, 'A4': 440.0, 'B4': 493.88, 'C5': 523.25}
CHORDS = [('C3', 'E3', 'G3'), ('A3', 'C4', 'E4'), ('F3', 'A3', 'C4'), ('G3', 'B3', 'D4')]
BPM = 92


def bed(total, lead=False, sad=False):
    beat = 60 / BPM
    bars = int(total / (beat * 4)) + 1
    out = np.zeros(int(SR * (bars * 4 * beat + 3)))
    cache = {}

    def pl(f, d):
        k = (round(f, 1), d)
        if k not in cache:
            cache[k] = S.pluck(f, d, 0.35)
        return cache[k]
    chords = [('A3', 'C4', 'E4'), ('F3', 'A3', 'C4'), ('C3', 'E3', 'G3'), ('E3', 'G3', 'B3')] if sad else CHORDS
    for bar in range(bars):
        ch = chords[bar % 4]
        t0 = bar * 4 * beat
        for e, acc in enumerate([1, 0, 0.6, 0.5, 0.9, 0, 0.6, 0.5]):  # picking folk
            if not acc:
                continue
            st = t0 + e * beat / 2
            nm = ch[e % 3]
            s = pl(NOTES[nm] * 2, 0.9)
            i = int(st * SR)
            out[i:i + len(s)] += s * 0.16 * acc
        for b in (0, 2):
            f = NOTES[ch[0]] / 2
            s = np.sin(2 * np.pi * f * S.t_(beat * 1.8)) * S.env(int(SR * beat * 1.8), 0.01, 1.0)
            i = int((t0 + b * beat) * SR)
            out[i:i + len(s)] += s * 0.28
        for b in range(8):
            j = int((t0 + b * beat / 2) * SR)
            sh = S.hp(S.rs.standard_normal(int(SR * 0.05)), 6500) * np.exp(-np.linspace(0, 7, int(SR * 0.05)))
            out[j:j + len(sh)] += sh * (0.05 if b % 2 else 0.03)
    return out[: int(SR * total)]


def voice_note(f, d, vowel=(700, 1150), choir=1):
    """« Voix » chantée synthétique : dent de scie + 2 formants, vibrato. choir > 1 = plusieurs voix."""
    t = S.t_(d)
    out = np.zeros(len(t))
    for k in range(choir):
        det = 1 + (k - choir / 2) * 0.006
        vib = 1 + 0.012 * np.sin(2 * np.pi * (5.2 + k * 0.3) * t)
        ph = np.cumsum(f * det * vib) / SR
        saw = 2 * (ph % 1) - 1
        v = S.bp(saw, vowel[0] * 0.8, vowel[0] * 1.25) + 0.6 * S.bp(saw, vowel[1] * 0.85, vowel[1] * 1.2)
        out += v / choir
    e = np.minimum(1, t / 0.04) * np.minimum(1, (d - t) / 0.08)
    return out * np.clip(e, 0, 1)


def sing(out, phrases, choir=1, oct_=1.0):
    """phrases : [(t0, t1, mots)] → note par syllabe (mélodie simple), timing des mots."""
    mel = ['E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4', 'G4', 'E4', 'D4', 'C4']
    words_t = []
    vowels = [(700, 1150), (400, 2000), (500, 900), (300, 870)]
    k = 0
    for t0, t1, txt in phrases:
        words = [w for w in txt.split() if any(ch.isalpha() for ch in w)]
        syl = [max(1, sum(ch in 'aeiouyéèêàâôîû' for ch in w.lower())) for w in words]
        tot = sum(syl)
        dt = (t1 - t0) / tot
        t = t0
        for w, s in zip(words, syl):
            words_t.append({"text": w, "start": round(t, 3), "end": round(t + s * dt, 3)})
            for _ in range(s):
                f = NOTES[mel[k % len(mel)]] * oct_
                v = voice_note(f, dt * 0.95, vowels[k % 4], choir)
                i = int(t * SR)
                j = min(len(out), i + len(v))
                out[i:j] += v[: j - i] * 0.5
                t += dt
                k += 1
    return words_t


def deflate():
    d = 0.55
    t = S.t_(d)
    f = 900 * np.exp(-t * 4) + 120
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3
    air = S.bp(S.rs.standard_normal(len(t)), 600, 4000) * 0.7
    return S.norm((tone + air) * np.exp(-t * 3.5) * np.minimum(1, t / 0.02), 0.7)


def pouf():
    d = 0.5
    t = S.t_(d)
    thump = np.sin(2 * np.pi * np.cumsum(70 + 160 * np.exp(-t * 18)) / SR) * np.exp(-t * 9)
    air = S.lp(S.rs.standard_normal(len(t)), 1800) * np.exp(-t * 12) * 0.6
    sparkle = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 7) for f in (1568, 2093, 2637)) * 0.12
    return S.norm(thump + air + sparkle, 0.85)


def scratch():
    d = 0.3
    t = S.t_(d)
    sp = np.sin(2 * np.pi * 9 * t)  # va-et-vient du disque
    noise = S.bp(S.rs.standard_normal(len(t)), 800, 5000)
    tone = np.sin(2 * np.pi * np.cumsum(500 + 450 * sp) / SR)
    return S.norm((noise * 0.6 + tone * 0.5) * (0.5 + 0.5 * np.abs(sp)) * np.minimum(1, (d - t) / 0.03), 0.85)


def rain(total=12.0):
    n = int(SR * total)
    x = S.bp(S.rs.standard_normal(n), 400, 9000) * 0.25
    drops = np.zeros(n)
    for _ in range(int(total * 90)):
        i = S.rs.integers(0, n - 2000)
        drops[i:i + 600] += S.hp(S.rs.standard_normal(600), 2500) * np.exp(-np.linspace(0, 8, 600)) * S.rs.uniform(0.1, 0.5)
    y = x + drops
    fade = int(SR * 0.3)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-fade:] *= np.linspace(1, 0, fade)
    return S.norm(y, 0.6)


def croak():
    d = 0.35
    t = S.t_(d)
    am = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 28 * t))
    v = S.bp(2 * ((np.cumsum(np.full(len(t), 180.0)) / SR) % 1) - 1, 300, 1400) * am
    return S.norm(v * np.exp(-t * 4), 0.7)


def save_mp3(path: Path, x):
    import subprocess
    import tempfile
    import soundfile as sf
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        w = Path(td) / "x.wav"
        sf.write(w, S.norm(x, 0.85), SR)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(w), "-b:a", "192k", str(path)], check=True)
    print(f"  {path.relative_to(ROOT)}  {len(x) / SR:.1f}s")


def main():
    ep = sys.argv[1] if len(sys.argv) > 1 else "ep06"
    script_path = (ROOT / "src" / "episodes" / ep / "script.json").resolve()
    epi = script_path.parent
    tmp = ROOT / "out" / ep / "temp"
    mus = epi / "musique"
    if not (mus / "originale.mp3").exists():
        x = bed(13.4)
        w = sing(x, [(0.15, 3.9, "J'habite une maison citrouille, Rapetipeto, le soleil est rond"),
                     (8.0, 9.9, "J'aime les grenouilles, et la pluie qui mouille"),
                     (10.0, 12.6, "et l'omelette aux hannetons")], choir=1, oct_=0.5)
        save_mp3(tmp / "originale.mp3", x)
        (tmp / "originale.paroles.json").write_text(json.dumps(w, ensure_ascii=False, indent=1))
    if not (mus / "fond_instrumental.mp3").exists():
        save_mp3(tmp / "fond_instrumental.mp3", bed(60.0, sad=False))
        save_mp3(tmp / "fond_triste.mp3", bed(60.0, sad=True))
    if not (mus / "chorale_finale.mp3").exists():
        x = bed(9.2)
        lines = ["Grisou chante dans sa citrouille,", "Rapetipeto,", "on lui dit pardon,", "Fini les embrouilles,",
                 "plus de nuit qui mouille,", "vive l'omelette aux hannetons !"]
        durs = [1.9, 1.0, 1.3, 1.4, 1.4, 2.0]
        t, ph = 0.1, []
        for ln, d in zip(lines, durs):
            ph.append((t, t + d - 0.05, ln))
            t += d
        w = sing(x, ph, choir=4)
        save_mp3(tmp / "chorale_finale.mp3", x)
        (tmp / "chorale_finale.paroles.json").write_text(json.dumps(w, ensure_ascii=False, indent=1))
    S.save("scratch", scratch())
    S.save("pfffuit", deflate())
    S.save("poufbig", pouf())
    S.save("pluie", rain())
    S.save("croak", croak())


if __name__ == "__main__":
    main()
