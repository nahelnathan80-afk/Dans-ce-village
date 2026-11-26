"""Timing mot à mot de la voix off.

1. whisper.cpp (pywhispercpp, modèle ggml-base) transcrit le MP3 avec un
   horodatage par mot ; on recale ensuite ces mots sur le TEXTE EXACT du
   scénario (alignement de séquences), pour garder l'orthographe et les
   mots-clés *…*.
2. Sans whisper : les mots sont répartis proportionnellement à leur longueur
   (avec une petite pause après la ponctuation).
Résultat mis en cache (cache/<ep>/align/<plan>.json) selon l'empreinte du MP3.
"""
import difflib
import hashlib
import json
import re
import subprocess
import tempfile
import unicodedata
from pathlib import Path

from . import config
from .scenario import words_with_keywords

_model = None


def _norm(w: str) -> str:
    w = unicodedata.normalize("NFD", w.lower())
    w = "".join(c for c in w if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9']", "", w)


def _whisper_words(mp3: Path):
    global _model
    try:
        from pywhispercpp.model import Model
    except ImportError:
        return None
    mpath = config.MODELS / "ggml-base.bin"
    if not mpath.exists():
        return None
    if _model is None:
        _model = Model(str(mpath), print_progress=False, print_realtime=False,
                       redirect_whispercpp_logs_to=None)
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "a.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp3), "-ar", "16000", "-ac", "1", str(wav)], check=True)
        segs = _model.transcribe(str(wav), language="fr", token_timestamps=True, max_len=1, split_on_word=True)
    out = []
    for s in segs:
        t = s.text.strip()
        if t:
            out.append((t, s.t0 / 100.0, s.t1 / 100.0))
    return out


def _proportional(words, total: float):
    """Répartit les mots sur la durée selon leur longueur (+ pauses ponctuation)."""
    weights = []
    for w, _ in words:
        wt = max(len(_norm(w)), 2) + 1.5
        if w[-1:] in ".?!…":
            wt += 5
        elif w[-1:] in ",:;":
            wt += 2.5
        weights.append(wt)
    s = sum(weights)
    t, out = 0.05, []
    span = max(total - 0.1, 0.5)
    for (w, kw), wt in zip(words, weights):
        d = span * wt / s
        out.append({"mot": w, "cle": kw, "t0": round(t, 3), "t1": round(t + d * 0.85, 3)})
        t += d
    return out


def align(mp3: Path, texte: str, plan_id: str, ep: str, voix_duree: float):
    words = words_with_keywords(texte)
    h = hashlib.sha1(mp3.read_bytes() + texte.encode()).hexdigest()[:16]
    cpath = config.CACHE / ep / "align" / f"{plan_id}.json"
    if cpath.exists():
        c = json.loads(cpath.read_text())
        if c.get("hash") == h:
            return c["mots"], c["methode"]
    methode = "proportionnelle"
    result = None
    try:
        ww = _whisper_words(mp3)
    except Exception as e:
        print(f"   [align] whisper a échoué ({e}) → répartition proportionnelle")
        ww = None
    if ww:
        a = [_norm(w) for w, _ in words]
        b = [_norm(w) for w, _, _ in ww]
        sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
        times = [None] * len(words)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                for k in range(i2 - i1):
                    times[i1 + k] = (ww[j1 + k][1], ww[j1 + k][2])
            elif tag == "replace" and j2 > j1:
                # bloc différent (ex. « vie » au lieu de « ville ») : on répartit le bloc
                t0, t1 = ww[j1][1], ww[j2 - 1][2]
                n = i2 - i1
                for k in range(n):
                    times[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
        # trous éventuels : interpolation entre voisins connus
        known = [i for i, t in enumerate(times) if t]
        if len(known) >= max(2, len(words) // 2):
            for i, t in enumerate(times):
                if t is None:
                    prev = max([k for k in known if k < i], default=None)
                    nxt = min([k for k in known if k > i], default=None)
                    t0 = times[prev][1] if prev is not None else 0.0
                    t1 = times[nxt][0] if nxt is not None else voix_duree
                    times[i] = (t0, max(t0 + 0.1, t1))
            result = [{"mot": w, "cle": kw, "t0": round(t[0], 3), "t1": round(t[1], 3)}
                      for (w, kw), t in zip(words, times)]
            methode = "whisper.cpp"
    if result is None:
        result = _proportional(words, voix_duree)
    cpath.parent.mkdir(parents=True, exist_ok=True)
    cpath.write_text(json.dumps({"hash": h, "methode": methode, "mots": result}, ensure_ascii=False, indent=1))
    return result, methode
