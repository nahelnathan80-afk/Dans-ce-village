#!/usr/bin/env python3
"""Contrôle qualité du rythme d'un épisode (BLOQUANT).

Mesure, sur la piste VOIX SEULE :
  - chaque silence de plus de 0,35 s (seule exception : la pause dramatique déclarée "pause": true, ≤ 0,5 s) ;
  - le % du temps couvert par la voix (pauses ≥ 0,2 s retirées) : objectif ≥ 85 % ;
  - la voix démarre à 0,0 s (≤ 0,15 s) ;
  - la durée de chaque cadrage (≤ 2,5 s) et ce qu'il montre (personnage ou objet cité, champ "shows") ;
  - les plans figés (si la vidéo est fournie : 2 images par cadrage comparées) ;
  - le débit en mots/s ;
  - le temps entre le dernier mot et la fin de la vidéo (≤ 1 s).

Affiche un tableau « TEMPS MORTS » et sort avec le code 1 si une règle n'est pas respectée.

Usage :
  python3 scripts/check_rythme.py --voice public/ep05/voice.wav --timeline src/episodes/ep05/timeline.json \
      --shots out/ep05/shots.json [--video rendu/ep05.mp4] [--report out/ep05/rythme.md]
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 16000
SEUIL_DB = -42.0          # en dessous : silence (voix normalisée à -14 LUFS)
PAUSE_MESURE = 0.20       # pauses comptées dans le % de voix (comme la mesure de référence)
SILENCE_MAX = 0.35        # silence interdit au-delà
PAUSE_DRAMA_MAX = 0.50    # pause dramatique déclarée
TOLERANCE_DRAMA = 0.12    # queue de mot comprise
COUVERTURE_MIN = 85.0
PLAN_MAX = 2.5
FIN_MAX = 1.0
DEBUT_MAX = 0.15
DEBIT_MIN = 2.8
INSTRU_MAX = 0.5        # instrumental sans paroles pendant une chanson
DIALOGUE_MAX = 0.25     # écart max entre deux répliques d'un dialogue


def load_audio(path: str) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def silences(a: np.ndarray, min_len: float):
    hop, win = int(0.01 * SR), int(0.03 * SR)
    n = max(1, (len(a) - win) // hop + 1)
    rms = np.array([np.sqrt(np.mean(a[i * hop:i * hop + win] ** 2) + 1e-12) for i in range(n)])
    db = 20 * np.log10(rms)
    quiet = db < SEUIL_DB
    out, start = [], None
    for i, q in enumerate(list(quiet) + [False]):
        if q and start is None:
            start = i
        elif not q and start is not None:
            s, e = start * hop / SR, min(len(a) / SR, (i * hop + win) / SR)
            if i == len(quiet):
                e = len(a) / SR
            if e - s >= min_len:
                out.append((s, e))
            start = None
    return out


def frame_diff(video: str, t0: float, t1: float) -> float:
    imgs = []
    for t in (t0, t1):
        raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1",
                              "-vf", "scale=108:192,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
        if len(raw) < 108 * 192:
            return 99.0
        imgs.append(np.frombuffer(raw[:108 * 192], dtype=np.uint8).astype(np.float32))
    return float(np.mean(np.abs(imgs[0] - imgs[1])))


def fmt(t: float) -> str:
    return f"{t:5.1f} s".replace(".", ",")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", required=True)
    ap.add_argument("--timeline", required=True)
    ap.add_argument("--shots")
    ap.add_argument("--video")
    ap.add_argument("--duration", type=float, help="durée de la vidéo (sinon : vidéo, puis cadrages, puis voix)")
    ap.add_argument("--report")
    ap.add_argument("--title", default="")
    args = ap.parse_args()

    tl = json.loads(Path(args.timeline).read_text())
    lines = tl["lines"]
    words = [w for l in lines for w in l["words"]]
    shots = json.loads(Path(args.shots).read_text())["shots"] if args.shots else []
    a = load_audio(args.voice)

    if args.duration:
        dur = args.duration
    elif args.video:
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", args.video],
                                   capture_output=True, text=True).stdout.strip())
    elif shots:
        dur = shots[-1]["to"]
    else:
        dur = len(a) / SR
    a = a[: int(dur * SR)]
    if len(a) < int(dur * SR):  # la vidéo dure plus longtemps que la piste voix : c'est du silence
        a = np.concatenate([a, np.zeros(int(dur * SR) - len(a), dtype=np.float32)])

    # pause dramatique déclarée : entre la fin de la réplique précédente et la réplique "pause": true
    drama = []
    for i, l in enumerate(lines):
        if l.get("pause") is True and i > 0:
            nxt = l if l["words"] else next((m for m in lines[i + 1:] if m["words"]), l)
            drama.append((lines[i - 1]["end"] - 0.1, nxt["start"] + 0.1))

    def shot_at(t):
        for s in shots:
            if s["from"] <= t < s["to"]:
                return s["id"]
        return "—"

    def cause(s, e):
        if s <= 0.05:
            return "début : la voix ne démarre pas sur la 1re image"
        last = words[-1]["end"] if words else 0
        if s >= last - 0.1:
            return "fin : attente après le dernier mot (carte-question)"
        prev = None
        for l in lines:
            if l["end"] <= s + 0.15:
                prev = l
        nxt = next((l for l in lines if l["start"] >= e - 0.15), None)
        inside = next((l for l in lines if l["start"] < s and l["end"] > e), None)
        if inside:
            return f"blanc au milieu de {inside['id']} (respiration trop longue dans la prise)"
        if prev is None:
            return "avant la 1re réplique"
        p = prev.get("pause")
        why = f"pause après {prev['id']}"
        if isinstance(p, (int, float)) and not isinstance(p, bool) and p > 0.25:
            why += f" (marge de {p:.1f} s dans le scénario)".replace(".", ",")
        if nxt is not None:
            why += f" → {nxt['id']}"
        return why

    NARR = ("vo", "narrateur")
    songs = [l for l in lines if l.get("type") == "chanson" and "song_start" in l]

    def in_song(t):
        return any(l["song_start"] - 0.02 <= t <= l["song_end"] + 0.02 for l in songs)

    def kind_at(t0, t1):
        if any(l["song_start"] - 0.05 <= t0 and t1 <= l["song_end"] + 0.05 for l in songs):
            return "chanson"
        prev = next((l for l in reversed(lines) if l["words"] and l["end"] <= t0 + 0.15), None)
        nxt = next((l for l in lines if l["words"] and l["start"] >= t1 - 0.15), None)
        if nxt is not None and nxt.get("scratch"):
            return "scratch"
        who = {x.get("who", "vo") for x in (prev, nxt) if x is not None}
        return "dialogue" if who - set(NARR) - {"chanson"} else "narration"

    # silences mesurés sur la piste ; pendant une chanson, ce sont les PAROLES qui comptent (pas l'instrumental)
    sil = []
    for s, e in silences(a, PAUSE_MESURE):
        cut = [(s, e)]
        for l in songs:
            nc = []
            for x0, x1 in cut:
                if x1 <= l["song_start"] or x0 >= l["song_end"]:
                    nc.append((x0, x1))
                    continue
                if x0 < l["song_start"]:
                    nc.append((x0, l["song_start"]))
                if x1 > l["song_end"]:
                    nc.append((l["song_end"], x1))
            cut = nc
        sil += [(x0, x1) for x0, x1 in cut if x1 - x0 >= PAUSE_MESURE]
    song_gaps = []
    for l in songs:
        ts = [l["song_start"]] + [x for w in l["words"] for x in (w["start"], w["end"])] + [l["song_end"]]
        for x0, x1 in zip(ts[0::2], ts[1::2]):
            if x1 - x0 >= PAUSE_MESURE:
                song_gaps.append((x0, x1))
                sil.append((x0, x1))
    sil.sort()
    morts, fails = [], []
    for s, e in song_gaps:
        if e - s > INSTRU_MAX:
            morts.append((s, e - s, shot_at(s + (e - s) / 2), "instrumental sans paroles", False, "chanson"))
    for s, e in sil:
        if (s, e) in song_gaps:
            continue
        d = e - s
        if d <= SILENCE_MAX:
            continue
        ty = kind_at(s, e)
        if words and s >= words[-1]["end"] - 0.1 and e >= dur - 0.02 and d <= FIN_MAX + 0.05:
            morts.append((s, d, shot_at(s + d / 2), "fin de la vidéo après le dernier mot (≤ 1 s, autorisé)", True, "fin"))
            continue
        is_drama = any(ds <= s + 0.05 and e - 0.05 <= de + 0.6 for ds, de in drama)
        if is_drama and d <= PAUSE_DRAMA_MAX + TOLERANCE_DRAMA:
            morts.append((s, d, shot_at(s + d / 2), "pause dramatique déclarée (autorisée)", True, "pause"))
            continue
        if ty == "scratch" and d <= 0.45:
            morts.append((s, d, shot_at(s + d / 2), "scratch de vinyle prévu (autorisé)", True, "scratch"))
            continue
        morts.append((s, d, shot_at(s + d / 2), cause(s, e), False, ty))
    morts.sort()

    total_sil = sum(e - s for s, e in sil)
    couverture = 100 * (1 - total_sil / dur) if dur else 0
    first = words[0]["start"] if words else 0
    last = words[-1]["end"] if words else 0
    # début de voix mesuré sur l'audio (le 1er silence commence à 0 ?)
    loud = np.where(np.abs(a[: SR * 3]) > 10 ** (SEUIL_DB / 20))[0]
    onset = loud[0] / SR if len(loud) else 3.0
    sw = [l for l in lines if l["words"] and l.get("type") != "chanson"]
    chant = sum(l["song_end"] - l["song_start"] for l in songs)
    debit = sum(len(l["words"]) for l in sw) / max(0.1, last - first - chant)
    fin = dur - last

    # cadrages
    plans_ko = []
    for s in shots:
        d = s["to"] - s["from"]
        probs = []
        if d > PLAN_MAX + 1e-3:
            probs.append(f"trop long ({d:.2f} s > {PLAN_MAX} s)".replace(".", ","))
        if not s.get("shows"):
            probs.append("ne déclare ni personnage ni objet cité (shows)")
        if args.video and d > 0.3:
            diff = frame_diff(args.video, s["from"] + d * 0.2, s["from"] + d * 0.85)
            s["diff"] = round(diff, 2)
            if diff < 0.6:
                probs.append(f"plan figé (écart images {diff:.2f})".replace(".", ","))
        if probs:
            plans_ko.append((s, probs))

    # dialogues : pas plus de 0,25 s entre deux répliques
    dia_ko = []
    spk = [l for l in lines if l["words"]]
    for p_, n_ in zip(spk, spk[1:]):
        between = lines[lines.index(p_) + 1: lines.index(n_)]
        if any(b.get("pause") for b in between):
            continue
        if p_.get("type") == "chanson" or n_.get("type") == "chanson":
            continue
        if {p_.get("who", "vo"), n_.get("who", "vo")} - set(NARR):
            g = n_["start"] - p_["end"]
            if g > DIALOGUE_MAX and not n_.get("scratch"):
                dia_ko.append((p_["id"], n_["id"], g))
    # moments musicaux : respectent "debut" et "fin" (±0,1 s)
    song_ko = []
    for l in songs:
        if l.get("fin") is not None:
            want = float(l["fin"]) - float(l.get("debut") or 0)
            got = l["song_end"] - l["song_start"]
            if abs(got - want) > 0.1:
                song_ko.append((l["id"], want, got))
    longs = [m for m in morts if not m[4]]
    checks = [
        (f"Silences > {SILENCE_MAX:.2f} s (hors pause dramatique)".replace(".", ","), f"{len(longs)}", len(longs) == 0),
        ("Plus longue pause", fmt(max([d for _, d, *_ in morts], default=max([e - s for s, e in sil], default=0))).strip(), True),
        (f"Voix présente (objectif ≥ {COUVERTURE_MIN:.0f} %)", f"{couverture:.1f} %".replace(".", ","), couverture >= COUVERTURE_MIN),
        ("Voix dès la 1re image (≤ 0,15 s)", fmt(onset).strip(), onset <= DEBUT_MAX),
        (f"Débit (objectif ≥ {DEBIT_MIN} mots/s)".replace(".", ","), f"{debit:.2f} mots/s".replace(".", ","), None if debit >= DEBIT_MIN else "warn"),
        (f"Cadrages > {PLAN_MAX} s ou sans sujet / figés".replace(".", ","), f"{len(plans_ko)} / {len(shots)}", len(plans_ko) == 0 if shots else None),
        ("Dernier mot → fin de la vidéo (≤ 1 s)", fmt(fin).strip(), fin <= FIN_MAX),
        ("Dialogues : écart entre répliques ≤ 0,25 s", (f"{len(dia_ko)} trop lent(s) : " + ", ".join(f"{a_}→{b_} {g:.2f} s" for a_, b_, g in dia_ko)).replace(".", ",") if dia_ko else "0 erreur", (not dia_ko) if spk else None),
        ("Moments musicaux = debut/fin du scénario (±0,1 s)", (", ".join(f"{i}: {g:.2f} s au lieu de {w:.2f}" for i, w, g in song_ko)).replace(".", ",") if song_ko else f"{len(songs)} moment(s) OK", (not song_ko) if songs else None),
        ("Durée de la vidéo", fmt(dur).strip(), None),
    ]

    out = []
    P = out.append
    P(f"# Contrôle du rythme {args.title}".rstrip())
    P("")
    P("## TEMPS MORTS")
    P("")
    P("| Moment | Durée | Type | Plan | Cause |")
    P("|---|---|---|---|---|")
    for s, d, shot, why, ok, ty in morts:
        P(f"| {fmt(s)} | {fmt(d)} | {ty} | {shot} | {'✅ ' if ok else '❌ '}{why} |")
    if not morts:
        P("| — | — | — | — | aucun silence de plus de 0,35 s |")
    P("")
    P("## Règles")
    P("")
    P("| Règle | Mesure | État |")
    P("|---|---|---|")
    for name, val, ok in checks:
        etat = "—" if ok is None else ("⚠️" if ok == "warn" else ("✅" if ok else "❌"))
        P(f"| {name} | {val} | {etat} |")
    if plans_ko:
        P("")
        P("## Cadrages à corriger")
        P("")
        P("| Cadrage | Début | Durée | Problème |")
        P("|---|---|---|---|")
        for s, probs in plans_ko:
            P(f"| {s['id']} | {fmt(s['from'])} | {fmt(s['to'] - s['from'])} | {' ; '.join(probs)} |")
    failed = [c for c in checks if c[2] is False]
    P("")
    P("**RÉSULTAT : " + ("✅ VERT — rythme validé**" if not failed else f"❌ ÉCHEC — {len(failed)} règle(s) non respectée(s)**"))
    text = "\n".join(out)
    print(text)
    if args.report:
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        Path(args.report).write_text(text + "\n")
        Path(args.report).with_suffix(".json").write_text(json.dumps({
            "duree": dur, "couverture": couverture, "debit": debit, "fin": fin, "debut": onset,
            "temps_morts": [{"t": s, "d": d, "type": ty, "plan": sh, "cause": w, "ok": ok} for s, d, sh, w, ok, ty in morts],
            "pauses": len(sil), "silence_total": total_sil, "cadrages": len(shots),
            "cadrages_ko": [{"id": s["id"], "problemes": p} for s, p in plans_ko], "ok": not failed,
        }, ensure_ascii=False, indent=1))
    sys.exit(0 if not failed else 1)


if __name__ == "__main__":
    main()
