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
    thr = max(-50.0, ref - 28)
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


TEMP_VOICES = {  # voix temporaires Piper (aperçu) : modèle, locuteur, débit, hauteur
    "narrateur": ("fr_FR-tom-medium", None, 0.86, 1.0),
    "vo": ("fr_FR-tom-medium", None, 0.86, 1.0),
    "leon": ("fr_FR-tom-medium", None, 0.84, 1.12),
    "grisou": ("fr_FR-upmc-medium", 1, 0.95, 0.82),
    "maire": ("fr_FR-tom-medium", None, 1.0, 0.9),
    "lou": ("fr_FR-siwis-medium", None, 0.85, 1.32),
    "rose": ("fr_FR-siwis-medium", None, 0.9, 1.08),
}


def temp_tts(lines: list[dict], dst: Path):
    """Voix temporaire : Piper, une voix par personnage (champ "qui"), toute l'histoire d'une traite."""
    from piper import PiperVoice, SynthesisConfig
    cache, parts, spans, t = {}, [], [], 0.0
    for l in lines:
        if not l["text"].strip() or l.get("type") == "chanson":
            continue
        model, spk, ls, pitch = TEMP_VOICES.get(l.get("qui", "vo"), TEMP_VOICES["vo"])
        if model not in cache:
            cache[model] = PiperVoice.load(str(ROOT / "tools" / "models" / f"{model}.onnx"))
        v = cache[model]
        syn = SynthesisConfig(speaker_id=spk, length_scale=ls, noise_scale=0.6, noise_w_scale=0.7)
        a = np.concatenate([c.audio_float_array for c in v.synthesize(tts.speakable(l.get("say", l["text"])), syn_config=syn)])
        a = tts.pitch_resample(a, v.config.sample_rate, pitch)
        parts += [a / (np.max(np.abs(a)) or 1) * 0.8, np.zeros(int(SR * 0.4), dtype=np.float32)]
        spans.append((t, t + len(a) / SR))
        t += len(a) / SR + 0.4
    sf.write(dst, np.concatenate(parts), SR)
    return spans


SONG_FILTERS = {
    None: "anull",
    "aucun": "anull",
    "chorale": "chorus=0.6:0.9:45|60|38:0.35|0.3|0.28:0.25|0.4|0.3:2|2.3|1.3,aecho=0.8:0.75:70:0.18",
    "radio": "highpass=f=450,lowpass=f=2600,acompressor=threshold=-24dB:ratio=4,volume=0.8",
}


def song_segment(script, l, epi_dir, ep):
    """Extrait chanté [debut, fin] du fichier, filtré, à -14 LUFS (× volume). Renvoie (audio, mots relatifs, source)."""
    f = epi_dir / l["fichier"]
    temp = False
    if not f.exists():
        f = ROOT / "out" / ep / "temp" / Path(l["fichier"]).name
        temp = True
        if not f.exists():
            sys.exit(f"✖ chanson introuvable : {l['fichier']} (lancer tools/temp_music.py {ep})")
    d0 = float(l.get("debut") or 0.0)
    d1 = l.get("fin")
    with tempfile.TemporaryDirectory() as td:
        o = Path(td) / "s.wav"
        cut = ["-ss", f"{d0:.3f}"] + (["-to", f"{float(d1):.3f}"] if d1 is not None else [])
        af = f"{SONG_FILTERS.get(l.get('filtre'), 'anull')},loudnorm=I=-14:TP=-1.5:LRA=11,volume={float(l.get('volume', 1.0)):.2f}"
        run(["ffmpeg", "-loglevel", "error", "-y", *cut, "-i", str(f), "-af", af, "-ac", "1", "-ar", str(SR), str(o)])
        seg, _ = sf.read(o, dtype="float32")
        if d1 is not None:  # durée exacte du scénario (l'écho de la chorale ne doit pas l'allonger)
            n = int((float(d1) - d0) * SR)
            seg = seg[:n]
            fo = min(len(seg), int(0.03 * SR))
            seg[-fo:] *= np.linspace(1, 0, fo)
        raw = Path(td) / "r.wav"
        run(["ffmpeg", "-loglevel", "error", "-y", *cut, "-i", str(f), "-ac", "1", "-ar", str(SR), str(raw)])
        rawa, _ = sf.read(raw, dtype="float32")
    dur = len(seg) / SR
    toks = [t.replace("*", "") for t in tts.display_tokens(l["text"])]
    words = None
    pj = f.with_suffix(".paroles.json")
    if temp and pj.exists():  # version temporaire : timing des syllabes connu
        ws = [w for w in json.loads(pj.read_text()) if d0 - 0.05 <= w["start"] < (d1 if d1 is not None else 1e9)]
        if len(ws) == len(toks):
            words = [(tk, w["start"] - d0, min(dur, w["end"] - d0)) for tk, w in zip(toks, ws)]
    if words is None:  # vraie chanson : whisper.cpp sur l'extrait
        hyp = whisper_words(rawa, "")
        ref = [n for tk in toks for n in tts._norm_words(tk)]
        sm = difflib.SequenceMatcher(a=ref, b=[h[0] for h in hyp], autojunk=False)
        match = {bl.a + k: bl.b + k for bl in sm.get_matching_blocks() for k in range(bl.size)}
        if len(match) >= 0.5 * len(ref):
            ki = sorted(match)
            st = np.interp(range(len(ref)), ki, [hyp[match[i]][1] for i in ki])
            en = np.interp(range(len(ref)), ki, [hyp[match[i]][2] for i in ki])
            words, c = [], 0
            for tk in toks:
                n = max(1, len(tts._norm_words(tk)))
                words.append((tk, float(st[c]), float(min(dur, en[c + n - 1]))))
                c += n
            print(f"  ♪ {l['id']} : {len(match)}/{len(ref)} mots chantés retrouvés par whisper")
        else:
            print(f"  ⚠ ♪ {l['id']} : whisper ne retrouve que {len(match)}/{len(ref)} mots chantés → répartition régulière")
            regs = silence_regions(seg)
            v0 = regs[0][1] if regs and regs[0][0] < 0.05 else 0.0
            v1 = regs[-1][0] if regs and regs[-1][1] > dur - 0.05 else dur
            letters = [max(1, len(tk)) for tk in toks]
            tot, c, words = sum(letters), 0, []
            for tk, n in zip(toks, letters):
                words.append((tk, v0 + (v1 - v0) * c / tot, v0 + (v1 - v0) * (c + n) / tot))
                c += n
    return seg, words, ("temporaire" if temp else str(f.relative_to(ROOT)))


def main():
    ep = sys.argv[1]
    ep_dir = ROOT / "src" / "episodes" / ep
    script_path = (ep_dir / "script.json").resolve()
    script = json.loads(script_path.read_text())
    epi_dir = script_path.parent  # episodes/<nom>/
    lines = script["lines"]
    gap = float(script.get("gap", GAP))
    gap_dia = float(script.get("gap_dialogue", 0.14))
    out_dir = ROOT / "out" / ep
    out_dir.mkdir(parents=True, exist_ok=True)
    dialogue_mode = any("qui" in l for l in lines)

    # ——— 1. source des voix parlées
    dia = epi_dir / "voix" / "dialogue.mp3"
    narr = epi_dir / "voix" / "narration.mp3"
    temp = False
    if dia.exists():
        sources, kind = [dia], "dialogue.mp3"
    elif narr.exists():
        sources, kind = [narr], "narration.mp3"
    elif script.get("voix_sources"):
        sources, kind = [ROOT / f for f in script["voix_sources"]], "fichiers du scénario"
    else:
        tmp = out_dir / "voix_temporaire.wav"
        print("  ⚠ pas de dialogue.mp3 / narration.mp3 → voix TEMPORAIRES (Piper, une par personnage)")
        temp_spans = temp_tts(lines, tmp)
        sources, kind, temp = [tmp], "voix temporaires Piper", True
    pieces = [load(p) for p in sources]
    sep = np.zeros(int(0.4 * SR), dtype=np.float32)
    a = np.concatenate([x for p in pieces for x in (p, sep)])[: -len(sep)]
    print(f"  source : {kind} ({len(a) / SR:.1f} s brut)")

    # ——— 2. whisper.cpp → mots du scénario (répliques parlées seulement)
    spoken = [l for l in lines if l["text"].strip() and l.get("type") != "chanson"]
    said = [tts.speakable(l.get("say", l["text"])) for l in spoken]
    hyp = whisper_words(a, "")
    ref, owner = [], []
    for li, s_ in enumerate(said):
        for n in tts._norm_words(s_):
            ref.append(n)
            owner.append(li)
    sm = difflib.SequenceMatcher(a=ref, b=[h[0] for h in hyp], autojunk=False)
    match = {}
    for bl in sm.get_matching_blocks():
        for k in range(bl.size):
            match[bl.a + k] = bl.b + k
    print(f"  whisper.cpp : {len(hyp)} mots reconnus, {len(match)}/{len(ref)} alignés sur le texte ({sm.ratio():.2f})")
    # contrôle réplique par réplique : on s'arrête au lieu de deviner
    bad = []
    for li, l in enumerate(spoken):
        idx = [i for i, o in enumerate(owner) if o == li]
        ok = sum(1 for i in idx if i in match)
        if ok < max(1, 0.5 * len(idx)):
            bad.append(f"{l['id']} [{l.get('qui', 'vo')}] « {l['text']} » : {ok}/{len(idx)} mots retrouvés")
    if bad:
        print("  ✖ alignement raté sur ces répliques :\n    " + "\n    ".join(bad))
        if dialogue_mode and not temp:
            sys.exit("✖ arrêt : vérifier que dialogue.mp3 contient exactement le texte du scénario, dans l'ordre")
    known = sorted((i, hyp[j][1], hyp[j][2]) for i, j in match.items())
    if not known:
        sys.exit("✖ whisper n'a reconnu aucun mot du scénario")
    ki = [k[0] for k in known]
    rs = np.interp(range(len(ref)), ki, [k[1] for k in known])
    re_ = np.interp(range(len(ref)), ki, [k[2] for k in known])
    approx = []
    for li in range(len(spoken)):
        idx = [i for i, o in enumerate(owner) if o == li]
        if temp and not any(i in match for i in idx):  # réplique non reconnue : temps répartis sur sa durée connue
            t0, t1 = temp_spans[li]
            for k, i in enumerate(idx):
                rs[i] = t0 + (t1 - t0) * k / len(idx)
                re_[i] = t0 + (t1 - t0) * (k + 1) / len(idx)
        approx.append((float(rs[idx[0]]), float(re_[idx[-1]])))

    # ——— 3. découpe sur les vrais silences
    regs = silence_regions(a)
    dur = len(a) / SR

    def best_cut(t0, t1):
        cand = [(max(s, t0), min(e, t1)) for s, e in regs if e > t0 and s < t1]
        cand = [c for c in cand if c[1] - c[0] > 0.02]
        if cand:
            return max(cand, key=lambda c: c[1] - c[0])
        m = (t0 + t1) / 2
        return (m, m)

    cuts = [(0.0, 0.0)]
    for li in range(len(spoken) - 1):
        if temp:  # voix temporaires : on connaît les bornes exactes de chaque réplique
            cuts.append((temp_spans[li][1] + 0.02, temp_spans[li + 1][0] - 0.02))
            continue
        s_next = approx[li + 1][0]
        cand = [(s, e) for s, e in regs if s_next - 0.6 <= e <= s_next + 0.3 and s >= approx[li][0]]
        if cand:
            cuts.append(min(cand, key=lambda c: abs(c[1] - (s_next - 0.05)) - 0.3 * min(0.5, c[1] - c[0])))
        else:
            cuts.append(best_cut(s_next - 0.3, s_next + 0.1))
    cuts.append((dur, dur))

    # ——— 4. chaque réplique : son audio (respirations internes raccourcies) + ses mots (temps locaux)
    fade = int(0.008 * SR)
    line_audio, line_words = [], []
    for li, l in enumerate(spoken):
        s0, s1 = cuts[li][1], cuts[li + 1][0]
        inner = [(max(s, s0), min(e, s1)) for s, e in regs if s > s0 + 0.02 and e < s1 - 0.02 and e - s > SEUIL_INTERNE]
        keeps, cur = [], s0
        for s, e in inner:
            keeps.append((cur, s + GAP_INTERNE / 2))
            cur = e - GAP_INTERNE / 2
        keeps.append((cur, s1))
        segs, tmap, t = [], [], 0.0
        for k0, k1 in keeps:
            seg = a[int(k0 * SR): int(k1 * SR)].copy()
            if len(seg) > 2 * fade:
                seg[:fade] *= np.linspace(0, 1, fade)
                seg[-fade:] *= np.linspace(1, 0, fade)
            tmap.append((k0, k1, t))
            segs.append(seg)
            t += len(seg) / SR
        audio = np.concatenate(segs) if segs else np.zeros(1, dtype=np.float32)
        # bords rognés : pas de silence avant le 1er mot ni après le dernier (0,03 s gardées)
        db_, hop_ = envelope_db(audio)
        loud_ = np.where(db_ > max(-50.0, np.percentile(db_, 95) - 28))[0]
        head = 0.0
        if len(loud_):
            head = max(0.0, loud_[0] * hop_ / SR - 0.03)
            tail = min(len(audio) / SR, loud_[-1] * hop_ / SR + 0.02 + 0.03)
            audio = audio[int(head * SR): int(tail * SR)].copy()
            if len(audio) > 2 * fade:
                audio[:fade] *= np.linspace(0, 1, fade)
                audio[-fade:] *= np.linspace(1, 0, fade)
            tmap = [(k0, k1, d0 - head) for k0, k1, d0 in tmap]
        le = len(audio) / SR

        def remap(x):
            for k0, k1, d0 in tmap:
                if x <= k1:
                    return d0 + max(0.0, x - k0)
            return le
        toks = emphasis_tokens(l["text"])
        idx = [i for i, o in enumerate(owner) if o == li]
        xs = [remap(float(rs[i])) for i in idx]
        xe = [remap(float(re_[i])) for i in idx]
        if xs:
            span0, span1 = xs[0], max(xe[-1], xs[0] + 0.05)
            kk = le / max(0.05, span1 - span0)
            xs = [(v - span0) * kk for v in xs]
            xe = [(v - span0) * kk for v in xe]
        letters = [max(1, len("".join(tts._norm_words(tk)))) for tk in toks]
        tot, nref = sum(letters), len(idx)
        words, c = [], 0
        for tk, w in zip(toks, letters):
            p0, p1 = c / tot * nref, (c + w) / tot * nref
            st = float(np.interp(p0, np.arange(nref), xs)) if nref > 1 else 0.0
            en = float(np.interp(p1 - 1e-6, np.arange(nref), xe)) if nref > 1 else le
            words.append([tk, 0.0 if c == 0 else st, max(en, st + 0.06)])
            c += w
        words[-1][2] = le
        for k in range(1, len(words)):
            words[k][1] = max(words[k][1], words[k - 1][1] + 0.05)
            if words[k - 1][2] > words[k][1]:
                words[k - 1][2] = words[k][1]
        line_audio.append(audio)
        line_words.append(words)

    # ——— 5. débit → atempo (1,10 max), parole seulement
    n_words = sum(len(w) for w in line_words)
    speech_t = sum(len(x) / SR for x in line_audio) + gap * max(0, len(spoken) - 1)
    debit = n_words / max(0.1, speech_t)
    tempo = 1.0
    if debit < DEBIT_CIBLE:
        tempo = min(TEMPO_MAX, DEBIT_CIBLE / debit)
    if script.get("tempo"):
        tempo = min(TEMPO_MAX, float(script["tempo"]))
    if abs(tempo - 1) > 1e-3:
        for i, x in enumerate(line_audio):
            with tempfile.TemporaryDirectory() as td:
                fi, fo = Path(td) / "i.wav", Path(td) / "o.wav"
                sf.write(fi, x, SR)
                run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(fi), "-af", f"atempo={tempo:.4f}", str(fo)])
                line_audio[i], _ = sf.read(fo, dtype="float32")
            line_words[i] = [[tk, st / tempo, en / tempo] for tk, st, en in line_words[i]]

    # ——— 6. assemblage : parole + chansons, rythme ping-pong des dialogues
    def gap_before(prev, l):
        if prev is None:
            return 0.0
        if l.get("scratch"):
            return 0.3                           # scratch de vinyle prévu
        if prev.get("type") == "chanson":
            return 0.08
        if l.get("type") == "chanson":
            return 0.05                          # coupe franche sur un temps fort
        q0, q1 = prev.get("qui", "vo"), l.get("qui", "vo")
        if q0 != q1:
            nw = len(tts.display_tokens(l["text"]))
            return 0.08 if nw <= 3 else gap_dia  # ping-pong (réplique courte : elle coupe presque la précédente)
        return gap

    placed_speech, placed_song, timeline = [], [], []
    t, prev, si = 0.0, None, 0
    songs_info = []
    for idx_l, l in enumerate(lines):
        entry = {kk: v for kk, v in l.items() if kk not in ("text", "plan")}
        entry["who"] = "chanson" if l.get("type") == "chanson" else l.get("qui", l.get("who", "vo"))
        if not l["text"].strip():                # pause dramatique (réplique muette)
            pd = min(PAUSE_DRAMA, float(script.get("pause_dramatique", PAUSE_DRAMA))) if l.get("pause") else 0.0
            entry.update({"text": "", "start": round(t, 3), "end": round(t + pd, 3), "words": []})
            t += pd
            timeline.append(entry)
            prev = None if pd else prev
            continue
        t += gap_before(prev, l)
        if l.get("type") == "chanson":
            seg, ws, src = song_segment(script, l, epi_dir, ep)
            placed_song.append((t, seg))
            entry.update({"text": l["text"], "start": round(t, 3), "end": round(t + len(seg) / SR, 3),
                          "song_start": round(t, 3), "song_end": round(t + len(seg) / SR, 3),
                          "words": [{"text": tk, "start": round(t + st, 3), "end": round(t + en, 3)} for tk, st, en in ws]})
            songs_info.append({"id": l["id"], "source": src, "duree": round(len(seg) / SR, 2),
                               "attendu": None if l.get("fin") is None else round(float(l["fin"]) - float(l.get("debut") or 0), 2)})
            t += len(seg) / SR
        else:
            x, ws = line_audio[si], line_words[si]
            si += 1
            placed_speech.append((t, x))
            entry["words"] = [{"text": tk, "start": round(t + st, 3), "end": round(t + en, 3)} for tk, st, en in ws]
            entry.update({"text": l["text"], "start": entry["words"][0]["start"], "end": entry["words"][-1]["end"]})
            t += len(x) / SR
        timeline.append(entry)
        prev = l

    total = t + QUEUE_FIN
    N = int(total * SR) + SR

    def mixdown(placed):
        m = np.zeros(N, dtype=np.float32)
        for st, x in placed:
            i = int(round(st * SR))
            m[i:i + len(x)] += x[: max(0, N - i)]
        return m[: int(total * SR)]
    speech = mixdown(placed_speech)
    speech = speech / (np.max(np.abs(speech)) or 1) * 0.89
    speech = tts.master(speech)[: int(total * SR)]
    if len(speech) < int(total * SR):
        speech = np.concatenate([speech, np.zeros(int(total * SR) - len(speech), dtype=np.float32)])
    songs = mixdown(placed_song)
    mix = np.clip(speech + songs, -0.99, 0.99)

    pub = ROOT / "public" / ep
    pub.mkdir(parents=True, exist_ok=True)
    sf.write(pub / "voice.wav", mix, SR, subtype="PCM_16")
    (ep_dir / "timeline.json").write_text(json.dumps({"duration": round(total, 3), "tempo": round(tempo, 3), "source": kind,
                                                       "lines": timeline}, ensure_ascii=False, indent=1))
    rep = {"source": kind, "brut": round(dur, 2), "duree_video": round(total, 2), "mots": n_words,
           "debit": round(debit * tempo, 2), "tempo": round(tempo, 3), "alignes": f"{len(match)}/{len(ref)}", "chansons": songs_info}
    (out_dir / "voice-report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1))
    print(f"✔ voix : {total:.1f} s (brut {dur:.1f} s), {n_words} mots parlés, {rep['debit']} mots/s, atempo {tempo:.3f}, {len(songs_info)} moment(s) chanté(s)")
    if total > 70.5:
        print(f"  ⚠ {total:.0f} s : au-delà de 70 s — couper du texte plutôt qu'accélérer au-delà de 1,10")


if __name__ == "__main__":
    main()
