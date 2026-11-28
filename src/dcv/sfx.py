"""Bruitages synthétisés (numpy) — libres de droits, réutilisables.
Dans le scénario : "sons": [{"type": "cloche", "debut": "0%", "volume": 1.0}, …]
Types : cloche, coeur (battements jusqu'à la fin du plan), grincement, porte_claque,
volet, pas_rapides, extinction (coupure électrique), coups_vitre, interrupteur, neon, craie, raclement.
"""
import numpy as np

SR = 48000


def _env(n, a=0.005, decay=3.0):
    t = np.arange(n) / SR
    e = np.exp(-t * decay)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def cloche(dur=3.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f0 = 220.0
    parts = [(1.0, 1.0), (2.0, 0.6), (2.4, 0.4), (3.0, 0.3), (4.2, 0.2), (5.4, 0.12)]   # partiels inharmoniques
    s = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t * (0.9 + r * 0.35)) for r, a in parts)
    return (s / 2.2).astype(np.float32)


def coeur(dur):
    """Battements « boum-boum » qui accélèrent légèrement."""
    n = int(dur * SR)
    out = np.zeros(n, np.float32)
    t0, per = 0.0, 0.85
    while t0 < dur:
        for off, amp in ((0.0, 1.0), (0.18, 0.7)):
            i = int((t0 + off) * SR)
            m = int(0.16 * SR)
            if i >= n:
                break
            tt = np.arange(min(m, n - i)) / SR
            out[i:i + len(tt)] += amp * np.sin(2 * np.pi * (48 + 30 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 22)
        t0 += per
        per = max(0.5, per * 0.97)
    return out * 0.9


def grincement(dur=1.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 380 + 160 * np.sin(2 * np.pi * 0.9 * t) + 40 * np.sin(2 * np.pi * 7 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sign(np.sin(ph)) * 0.3 + 0.2 * np.sin(ph * 2.01)
    env = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.3)
    return (s * env * 0.35).astype(np.float32)


def porte_claque(dur=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(1)
    thud = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 30)) * t) * np.exp(-t * 9)
    noise = rng.normal(0, 1, n) * np.exp(-t * 35) * 0.5
    return ((thud + noise) * 0.9).astype(np.float32)


def volet(dur=0.9):
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(2)
    rattle = rng.normal(0, 1, n) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 28 * t))) * 0.25
    env = np.minimum(1, t / 0.05) * np.exp(-np.maximum(0, t - 0.6) * 12)
    end = np.zeros(n)
    i = int(0.62 * SR)
    tt = t[i:] - t[i]
    end[i:] = np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 14)
    return ((rattle * env + end * 0.8)).astype(np.float32)


def pas_rapides(dur=2.6):
    n = int(dur * SR)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(3)
    for k in range(int(dur / 0.21)):
        i = int(k * 0.21 * SR)
        m = int(0.07 * SR)
        if i + m > n:
            break
        tt = np.arange(m) / SR
        out[i:i + m] += (rng.normal(0, 1, m) * 0.4 + np.sin(2 * np.pi * 110 * tt)) * np.exp(-tt * 60)
    return out * 0.6


def extinction(dur=0.8):
    n = int(dur * SR)
    t = np.arange(n) / SR
    clunk = np.sin(2 * np.pi * 120 * t) * np.exp(-t * 18)
    hum = np.sin(2 * np.pi * 50 * t) * 0.4 * np.clip(1 - t / 0.5, 0, 1) * (1 + 0.3 * np.sin(2 * np.pi * 9 * t))
    return ((clunk + hum) * 0.7).astype(np.float32)


def coups_vitre(dur=1.6):
    """Trois coups secs sur une vitre (toc… toc… toc)."""
    n = int(dur * SR)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(4)
    for k in range(3):
        i = int(k * 0.48 * SR)
        m = int(0.18 * SR)
        tt = np.arange(m) / SR
        knock = np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 45) + 0.5 * np.sin(2 * np.pi * 1350 * tt) * np.exp(-tt * 70)
        knock += rng.normal(0, 1, m) * np.exp(-tt * 120) * 0.4
        out[i:i + m] += knock
    return out * 0.9


def interrupteur(dur=0.25):
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(5)
    return ((rng.normal(0, 1, n) * np.exp(-t * 300) + np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 200)) * 0.6).astype(np.float32)


def neon(dur=2.5):
    """Bourdonnement de néon qui grésille."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(6)
    hum = np.sin(2 * np.pi * 100 * t) * 0.35 + np.sin(2 * np.pi * 200 * t) * 0.15
    cut = (rng.random(int(dur * 12) + 1) < 0.3).repeat(SR // 12)[:n]
    crack = rng.normal(0, 1, n) * 0.25 * np.repeat(rng.random(int(dur * 40) + 1) < 0.15, SR // 40)[:n]
    return ((hum * (1 - cut) + crack) * 0.5).astype(np.float32)


def craie(dur=1.8):
    """Craie qui grince sur le tableau."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(7)
    strokes = (np.sin(2 * np.pi * 3.2 * t) > -0.2).astype(float)
    s = rng.normal(0, 1, n) * 0.25 + np.sign(np.sin(2 * np.pi * (900 + 300 * np.sin(2 * np.pi * 5 * t)) * t)) * 0.08
    return (s * strokes * np.minimum(1, (dur - t) / 0.2) * 0.6).astype(np.float32)


def raclement(dur=1.0):
    """Chaise qui racle le sol."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 140 + 60 * np.sin(2 * np.pi * 9 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    rng = np.random.default_rng(8)
    s = np.sign(np.sin(ph)) * 0.3 + rng.normal(0, 1, n) * 0.15
    env = np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.2)
    return (s * env * 0.6).astype(np.float32)


SONS = {"neon": neon, "craie": craie, "raclement": raclement, "coups_vitre": coups_vitre, "interrupteur": interrupteur, "cloche": cloche, "grincement": grincement, "porte_claque": porte_claque, "volet": volet,
        "pas_rapides": pas_rapides, "extinction": extinction}


def render(spec_son, reste):
    """Échantillons d'un bruitage ; « reste » = secondes jusqu'à la fin du plan."""
    typ = spec_son.get("type")
    if typ == "coeur":
        s = coeur(max(0.5, reste))
    elif typ in SONS:
        s = SONS[typ]()
    else:
        return None
    return s * float(spec_son.get("volume", 1.0))
