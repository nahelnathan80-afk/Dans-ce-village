#!/usr/bin/env python3
"""LA VOIX PILOTE TOUT — construit une piste de narration continue et ses timestamps par mot.

Usage : python3 tools/voice.py ep05

Source de la voix (dans l'ordre de préférence) :
  1. episodes/<nom>/voix/narration.mp3  — toute l'histoire lue d'une traite (ElevenLabs). MÉTHODE À PRIVILÉGIER.
  2. "voix_sources" du scénario : liste de fichiers lus à la suite (ex. anciens lots A/B/C).
  3. sinon : voix TEMPORAIRE Piper (fr_FR-tom-medium), pour les aperçus.

Traitement :
  - silences coupés au début et à la fin (ffmpeg silenceremove, -45 dB, 0,05 s gardées) ;
  - whisper.cpp (timestamps par mot) retrouve le texte de chaque réplique du scénario ;
  - chaque réplique est recollée à la suivante avec 0,15–0,25 s de respiration (« gap », défaut 0,2 s) ;
    les respirations internes de plus de 0,25 s sont ramenées à 0,18 s ;
  - UNE seule pause dramatique autorisée : la réplique marquée "pause": true (0,5 s max) ;
  - si le débit est < 2,8 mots/s, la voix est accélérée (atempo, 1,10 maximum, hauteur inchangée) ;
  - la vidéo dure exactement : dernier mot + 0,8 s.

Sorties : public/<ep>/voice.wav, src/episodes/<ep>/timeline.json, out/<ep>/voice-report.json
"""
import difflib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tts  # noqa: E402  (display_tokens, speakable, _norm_words, master)

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
GAP = 0.20            # respiration entre deux répliques
GAP_INTERNE = 0.18    # respiration interne max (virgule, point au milieu d'une réplique)
SEUIL_INTERNE = 0.25  # au-delà, une respiration interne est raccourcie
PAUSE_DRAMA = 0.50
DEBIT_CIBLE = 2.8
TEMPO_MAX = 1.10
QUEUE_FIN = 0.8
WHISPER_MODEL = ROOT / "tools" / "models" / "ggml-small.bin"


def run(cmd):
    subprocess.run(cmd, check=True)


def load(path: Path) -> np.ndarray:
    """Charge, passe en mono 48 kHz et coupe les silences de début / fin (-45 dB, 0,05 s gardées)."""
    with tempfile.TemporaryDirectory() as td:
        o = Path(td) / "o.wav"
        trim = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,"
                "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse")
        run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(path), "-af", trim, "-ac", "1", "-ar", str(SR), str(o)])
        a, _ = sf.read(o, dtype="float32")
    return a


def whisper_words(a: np.ndarray, prompt: str):
    """whisper.cpp (timestamps DTW par token) : liste de (mot normalisé, début, fin) en secondes.
    Le début d'un mot = instant DTW de son 1er token ; sa fin = début du mot suivant."""
    from pywhispercpp.model import Model
    import _pywhispercpp as pw
    from scipy.signal import resample_poly
    a16 = resample_poly(a, 1, 3).astype(np.float32)
    m = Model(str(WHISPER_MODEL), n_threads=4, language="fr", print_progress=False, print_realtime=False,
              redirect_whispercpp_logs_to=None,
              context_params={"dtw_token_timestamps": True, "dtw_aheads_preset": pw.WHISPER_AHEADS_SMALL, "flash_attn": False})
    m.transcribe(a16, token_timestamps=True)  # pas d'invite : avec le texte en invite, whisper répète des phrases
    ctx = m._ctx
    raw = []  # [texte, début]
    for i in range(pw.whisper_full_n_segments(ctx)):
        for j in range(pw.whisper_full_n_tokens(ctx, i)):
            txt = pw.whisper_full_get_token_text(ctx, i, j)
            if txt.startswith("[_") or not txt.strip():
                continue
            t = max(0.0, pw.whisper_full_get_token_data(ctx, i, j).t_dtw / 100)
            if txt.startswith(" ") or not raw or not re.search(r"\w", raw[-1][0] + "x") or (re.match(r"\w", txt) is None and False):
                if re.search(r"\w", txt) or not raw:
                    raw.append([txt.strip(), t])
                    continue
            raw[-1][0] += txt
    out = []
    for k, (txt, t0) in enumerate(raw):
        t1 = raw[k + 1][1] if k + 1 < len(raw) else t0 + 0.4
        for n in tts._norm_words(txt):
            out.append((n, t0, max(t0 + 0.04, t1)))
    return out


def envelope_db(a: np.ndarray, hop_s=0.005, win_s=0.02):
    hop, win = int(hop_s * SR), int(win_s * SR)
    n = max(1, (len(a) - win) // hop + 1)
    idx = np.arange(n) * hop
    sq = np.concatenate([[0.0], np.cumsum(a.astype(np.float64) ** 2)])
    rms = np.sqrt((sq[idx + win] - sq[idx]) / win + 1e-12)
    return 20 * np.log10(rms), hop


def silence_regions(a: np.ndarray, min_len=0.06):
    """Zones de silence (début, fin) en secondes. Seuil relatif au niveau de la voix."""
    db, hop = envelope_db(a)
    ref = np.percentile(db, 95)
    thr = max(-50.0, ref - 32)
    quiet = db < thr
    regs, st = [], None
    for i, q in enumerate(list(quiet) + [False]):
        if q and st is None:
            st = i
        elif not q and st is not None:
            s, e = st * hop / SR, i * hop / SR
            if e - s >= min_len:
                regs.append((s, e))
            st = None
    return regs


def emphasis_tokens(text: str) -> list[str]:
    """Mots affichés ; un passage *entre astérisques* de plusieurs mots marque chaque mot."""
    toks = tts.display_tokens(text)
    out, on = [], False
    for t in toks:
        n = t.count("*")
        bare = t.replace("*", "")
        out.append(f"*{bare}*" if (on or n) else bare)
        if n % 2 == 1:
            on = not on
    return out


def temp_tts(lines: list[dict], dst: Path):
    """Voix temporaire : Piper, toute l'histoire d'une traite (comme un fichier ElevenLabs)."""
    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(str(ROOT / "tools" / "models" / "fr_FR-tom-medium.onnx"))
    syn = SynthesisConfig(length_scale=0.86, noise_scale=0.6, noise_w_scale=0.7)
    parts = []
    for l in lines:
        if not l["text"].strip():
            continue
        txt = tts.speakable(l.get("say", l["text"]))
        a = np.concatenate([c.audio_float_array for c in voice.synthesize(txt, syn_config=syn)])
        parts += [a, np.zeros(int(voice.config.sample_rate * 0.35), dtype=np.float32)]
    with tempfile.TemporaryDirectory() as td:
        w = Path(td) / "t.wav"
        sf.write(w, np.concatenate(parts), voice.config.sample_rate)
        run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(w), "-ar", str(SR), "-ac", "1", str(dst)])


def main():
    ep = sys.argv[1]
    ep_dir = ROOT / "src" / "episodes" / ep
    script_path = (ep_dir / "script.json").resolve()
    script = json.loads(script_path.read_text())
    epi_dir = script_path.parent  # episodes/<nom>/
    lines = script["lines"]
    gap = float(script.get("gap", GAP))
    out_dir = ROOT / "out" / ep
    out_dir.mkdir(parents=True, exist_ok=True)

    # ——— 1. source
    narr = epi_dir / "voix" / "narration.mp3"
    if narr.exists():
        sources, kind = [narr], "narration.mp3"
    elif script.get("voix_sources"):
        sources, kind = [ROOT / f for f in script["voix_sources"]], "fichiers du scénario"
    else:
        tmp = out_dir / "narration_temporaire.wav"
        print("  ⚠ pas de narration.mp3 → voix TEMPORAIRE (Piper)")
        temp_tts(lines, tmp)
        sources, kind = [tmp], "voix temporaire Piper"
    pieces = [load(p) for p in sources]
    sep = np.zeros(int(0.4 * SR), dtype=np.float32)
    a = np.concatenate([x for p in pieces for x in (p, sep)])[: -len(sep)]
    print(f"  source : {kind} ({len(a) / SR:.1f} s brut)")

    # ——— 2. whisper.cpp → mots du scénario
    spoken = [l for l in lines if l["text"].strip()]
    said = [tts.speakable(l.get("say", l["text"])) for l in spoken]
    hyp = whisper_words(a, " ".join(said))
    ref, owner = [], []
    for li, s in enumerate(said):
        for n in tts._norm_words(s):
            ref.append(n)
            owner.append(li)
    sm = difflib.SequenceMatcher(a=ref, b=[h[0] for h in hyp], autojunk=False)
    match = {}
    for bl in sm.get_matching_blocks():
        for k in range(bl.size):
            match[bl.a + k] = bl.b + k
    print(f"  whisper.cpp : {len(hyp)} mots reconnus, {len(match)}/{len(ref)} alignés sur le texte ({sm.ratio():.2f})")
    # temps de chaque mot de référence (interpolé si non reconnu)
    known = sorted((i, hyp[j][1], hyp[j][2]) for i, j in match.items())
    if not known:
        sys.exit("✖ whisper n'a reconnu aucun mot du scénario")
    ki = [k[0] for k in known]
    rs = np.interp(range(len(ref)), ki, [k[1] for k in known])
    re_ = np.interp(range(len(ref)), ki, [k[2] for k in known])

    # bornes approximatives de chaque réplique dans le fichier
    approx = []
    for li in range(len(spoken)):
        idx = [i for i, o in enumerate(owner) if o == li]
        approx.append((float(rs[idx[0]]), float(re_[idx[-1]])))

    # ——— 3. découpe sur les vrais silences
    regs = silence_regions(a)
    dur = len(a) / SR

    def best_cut(t0, t1):
        """Silence le plus long dans [t0, t1] → (début, fin) ; sinon point milieu."""
        cand = [(max(s, t0), min(e, t1)) for s, e in regs if e > t0 and s < t1]
        cand = [c for c in cand if c[1] - c[0] > 0.02]
        if cand:
            return max(cand, key=lambda c: c[1] - c[0])
        m = (t0 + t1) / 2
        return (m, m)

    cuts = [(0.0, 0.0)]
    for li in range(len(spoken) - 1):
        s_next = approx[li + 1][0]  # début DTW du 1er mot de la réplique suivante (≈ fin du silence)
        cand = [(s, e) for s, e in regs if s_next - 0.6 <= e <= s_next + 0.3 and s >= approx[li][0]]
        if cand:
            cuts.append(min(cand, key=lambda c: abs(c[1] - (s_next - 0.05)) - 0.3 * min(0.5, c[1] - c[0])))
        else:
            cuts.append(best_cut(s_next - 0.3, s_next + 0.1))
    cuts.append((dur, dur))

    # ——— 4. assemblage : répliques recollées, respirations internes raccourcies
    out_parts, tmap = [], []  # tmap : (src0, src1, dst0) segments conservés
    t = 0.0
    line_spans = []
    fade = int(0.008 * SR)

    def put(s0, s1):
        nonlocal t
        seg = a[int(s0 * SR): int(s1 * SR)].copy()
        if len(seg) > 2 * fade:
            seg[:fade] *= np.linspace(0, 1, fade)
            seg[-fade:] *= np.linspace(1, 0, fade)
        out_parts.append((t, seg))
        tmap.append((s0, s1, t))
        t += len(seg) / SR

    pause_before = {}
    for i, l in enumerate(lines):
        if l.get("pause") is True:
            # pause déclarée sur une réplique vide → avant la réplique parlée suivante
            j = i if l["text"].strip() else next((k for k in range(i + 1, len(lines)) if lines[k]["text"].strip()), None)
            if j is not None:
                pause_before[lines[j]["id"]] = min(PAUSE_DRAMA, float(script.get("pause_dramatique", PAUSE_DRAMA)))

    for li, l in enumerate(spoken):
        s0 = cuts[li][1]
        s1 = cuts[li + 1][0]
        if li > 0:
            t += pause_before.get(l["id"], gap)
        start_t = t
        # silences internes à la réplique
        inner = [(max(s, s0), min(e, s1)) for s, e in regs if s > s0 + 0.02 and e < s1 - 0.02 and e - s > SEUIL_INTERNE]
        cur = s0
        for s, e in inner:
            keep = GAP_INTERNE / 2
            put(cur, s + keep)
            cur = e - keep
        put(cur, s1)
        line_spans.append((start_t, t))

    voiced = np.zeros(int(t * SR) + SR, dtype=np.float32)
    for st, seg in out_parts:
        i = int(round(st * SR))
        voiced[i:i + len(seg)] += seg
    voiced = voiced[: int(t * SR)]

    def remap(x):
        best = None
        for s0, s1, d0 in tmap:
            if s0 <= x <= s1:
                return d0 + (x - s0)
            if x < s0:
                best = d0 if best is None else best
                return d0
        return t if best is None else best

    # ——— 5. mots par réplique (timestamps whisper recalés dans la nouvelle piste)
    words_by_line = []
    for li, l in enumerate(spoken):
        toks = emphasis_tokens(l["text"])
        idx = [i for i, o in enumerate(owner) if o == li]
        xs = [remap(float(rs[i])) for i in idx]
        xe = [remap(float(re_[i])) for i in idx]
        ls, le = line_spans[li]
        # contraintes : le 1er mot commence au début de la réplique, le dernier finit à sa fin
        if xs:
            span0, span1 = xs[0], max(xe[-1], xs[0] + 0.05)
            k = (le - ls) / max(0.05, span1 - span0)
            xs = [ls + (v - span0) * k for v in xs]
            xe = [ls + (v - span0) * k for v in xe]
        # mots normalisés → mots affichés (au prorata des lettres)
        letters = [max(1, len("".join(tts._norm_words(tk)))) for tk in toks]
        tot = sum(letters)
        nref = len(idx)
        words, c = [], 0
        for tk, w in zip(toks, letters):
            p0, p1 = c / tot * nref, (c + w) / tot * nref
            st = float(np.interp(p0, np.arange(nref), xs)) if nref > 1 else ls
            en = float(np.interp(p1 - 1e-6, np.arange(nref), xe)) if nref > 1 else le
            if c == 0:
                st = ls
            words.append([tk, st, max(en, st + 0.06)])
            c += w
        words[-1][2] = le
        for k in range(1, len(words)):  # monotone, sans chevauchement
            words[k][1] = max(words[k][1], words[k - 1][1] + 0.05)
            words[k - 1][2] = min(words[k - 1][2], words[k][1]) if words[k - 1][2] > words[k][1] else words[k - 1][2]
        words_by_line.append(words)

    # ——— 6. débit → atempo (1,10 max)
    n_words = sum(len(w) for w in words_by_line)
    debit = n_words / max(0.1, t)
    tempo = 1.0
    if debit < DEBIT_CIBLE:
        tempo = min(TEMPO_MAX, DEBIT_CIBLE / debit)
    if script.get("tempo"):
        tempo = min(TEMPO_MAX, float(script["tempo"]))
    if abs(tempo - 1) > 1e-3:
        with tempfile.TemporaryDirectory() as td:
            i, o = Path(td) / "i.wav", Path(td) / "o.wav"
            sf.write(i, voiced, SR)
            run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(i), "-af", f"atempo={tempo:.4f}", str(o)])
            voiced, _ = sf.read(o, dtype="float32")
    k = 1 / tempo
    total = t * k + QUEUE_FIN
    mix = np.zeros(int(total * SR), dtype=np.float32)
    mix[: len(voiced)] = voiced[: len(mix)]
    mix = mix / (np.max(np.abs(mix)) or 1) * 0.89
    mix = tts.master(mix)[: int(total * SR)]
    if len(mix) < int(total * SR):
        mix = np.concatenate([mix, np.zeros(int(total * SR) - len(mix), dtype=np.float32)])

    # ——— 7. timeline
    timeline, wi = [], 0
    prev_end = 0.0
    for l in lines:
        entry = {kk: v for kk, v in l.items() if kk not in ("text", "plan")}
        if l["text"].strip():
            ws = words_by_line[wi]
            wi += 1
            entry["words"] = [{"text": tk, "start": round(st * k, 3), "end": round(en * k, 3)} for tk, st, en in ws]
            entry.update({"text": l["text"], "start": entry["words"][0]["start"], "end": entry["words"][-1]["end"]})
            prev_end = entry["end"]
        else:  # réplique muette (pause dramatique) : occupe le blanc avant la suivante
            nxt = words_by_line[wi][0][1] * k if wi < len(words_by_line) else prev_end
            entry.update({"text": "", "start": round(prev_end, 3), "end": round(max(prev_end, nxt), 3), "words": []})
        timeline.append(entry)

    pub = ROOT / "public" / ep
    pub.mkdir(parents=True, exist_ok=True)
    sf.write(pub / "voice.wav", mix, SR, subtype="PCM_16")
    (ep_dir / "timeline.json").write_text(json.dumps({"duration": round(total, 3), "tempo": round(tempo, 3), "source": kind,
                                                       "lines": timeline}, ensure_ascii=False, indent=1))
    rep = {"source": kind, "brut": round(dur, 2), "voix": round(t * k, 2), "duree_video": round(total, 2),
           "mots": n_words, "debit_avant": round(debit, 2), "debit": round(n_words / (t * k), 2), "tempo": round(tempo, 3),
           "alignes": f"{len(match)}/{len(ref)}"}
    (out_dir / "voice-report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1))
    print(f"✔ voix : {total:.1f} s (brut {dur:.1f} s), {n_words} mots, {rep['debit']} mots/s, atempo {tempo:.3f}")
    if total > 70.5:
        print(f"  ⚠ {total:.0f} s : au-delà de 70 s — couper du texte plutôt qu'accélérer au-delà de 1,10")


if __name__ == "__main__":
    main()
