#!/usr/bin/env python3
"""Génère la voix off d'un épisode + les timestamps par mot.

Deux moteurs, choisis par voix dans script.json ("engine") :
  - "piper"      : rapide, timestamps exacts issus du modèle (voix plus neutre)
  - "chatterbox" : Chatterbox Multilingual (MIT), voix expressive clonée depuis un
                   extrait de référence ; timestamps par alignement whisper.

Usage : python3 tools/tts.py [ep01]        (chatterbox → lancer avec le Python de son venv)

Entrée  : src/episodes/<ep>/script.json
Sorties : public/<ep>/voice.wav          (48 kHz mono, toutes les répliques mixées)
          src/episodes/<ep>/timeline.json (début/fin de chaque réplique et de chaque mot)

Les timestamps viennent directement de Piper (durée de chaque phonème prédite par
le modèle), donc ils sont exacts à l'échantillon près — pas besoin d'alignement après coup.
Modèles attendus dans tools/models/ (voir README).
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "tools" / "models"
SR = 48000
LEAD_IN = 0.15  # silence au tout début (s)

_voices: dict = {}


def load_voice(model: str):
    from piper import PiperVoice
    if model not in _voices:
        _voices[model] = PiperVoice.load(str(MODELS / f"{model}.onnx"), include_alignments=True)
    return _voices[model]


def display_tokens(text: str) -> list[str]:
    """Découpe le texte en mots affichables ; la ponctuation isolée (« » ? !) se colle au mot voisin."""
    raw = text.split()
    out: list[str] = []
    pending_prefix = ""
    for tok in raw:
        if not re.search(r"\w", tok):
            if tok in ("«", "(", "“"):
                pending_prefix += tok + " "
            elif out:
                out[-1] += " " + tok if tok in ("?", "!", ":", ";", "»") else tok
            else:
                pending_prefix += tok
            continue
        out.append(pending_prefix + tok)
        pending_prefix = ""
    return out


def speakable(text: str) -> str:
    """Texte envoyé au TTS (on enlève les guillemets qui perturbent la prosodie)."""
    return re.sub(r"[«»“”]", "", text).replace("…", ",").strip()


def synth_line(text: str, cfg: dict):
    """Retourne (audio float32 @SR, liste de (début, fin) par mot en secondes)."""
    if cfg.get("engine") == "chatterbox":
        return synth_chatterbox(text, cfg)
    from piper import SynthesisConfig
    voice = load_voice(cfg["model"])
    syn = SynthesisConfig(
        speaker_id=cfg.get("speaker", 0) if voice.config.num_speakers > 1 else None,
        length_scale=cfg.get("lengthScale", 1.0),
        noise_scale=0.6,
        noise_w_scale=0.7,
    )
    src_sr = voice.config.sample_rate
    audio_parts, bounds = [], []  # bounds : groupes de phonèmes (= mots) en échantillons
    offset = 0
    for chunk in voice.synthesize(speakable(text), syn_config=syn, include_alignments=True):
        a = chunk.audio_float_array
        al = chunk.phoneme_alignments or []
        pos = offset
        cur_start = None
        for ph in al:
            is_sep = ph.phoneme in (" ", "^", "$") or not re.search(r"\w", ph.phoneme)
            if not is_sep and cur_start is None:
                cur_start = pos
            if ph.phoneme == " " or ph.phoneme == "$":
                if cur_start is not None:
                    bounds.append((cur_start, pos))
                    cur_start = None
            pos += ph.num_samples
        if cur_start is not None:
            bounds.append((cur_start, pos))
        audio_parts.append(a)
        offset += len(a)
    audio = np.concatenate(audio_parts)

    out = pitch_resample(audio, src_sr, cfg.get("pitch", 1.0))
    ratio = SR / src_sr
    words = [(s * ratio / SR, e * ratio / SR) for s, e in bounds]
    return out * cfg.get("gain", 1.0), words


def pitch_resample(audio, src_sr, pitch=1.0):
    """Changement de hauteur (voix plus jeune / plus grave) sans changer la durée, + passage à 48 kHz."""
    with tempfile.TemporaryDirectory() as td:
        i, o = Path(td) / "i.wav", Path(td) / "o.wav"
        sf.write(i, audio, src_sr)
        af = f"rubberband=pitch={pitch}:transients=smooth:formant=shifted," if abs(pitch - 1) > 1e-3 else ""
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", str(i), "-af",
             f"{af}aresample={SR}", "-ac", "1", str(o)], check=True)
        out, _ = sf.read(o, dtype="float32")
    return out


# ——— Chatterbox (voix expressive) ———
_cb = {}


def _norm_words(s: str) -> list[str]:
    import unicodedata
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.findall(r"[a-z0-9]+", s.replace("'", " "))


def _whisper():
    if "wh" not in _cb:
        from faster_whisper import WhisperModel
        _cb["wh"] = WhisperModel("small", device="cpu", compute_type="int8")
    return _cb["wh"]


def align(audio48: np.ndarray, text: str):
    """Timestamps des mots par whisper. Renvoie (mots reconnus, [(début, fin)], score de fidélité 0..1)."""
    from scipy.signal import resample_poly
    a16 = resample_poly(audio48, 1, 3).astype(np.float32)
    segs, _ = _whisper().transcribe(a16, language="fr", word_timestamps=True, beam_size=3,
                                    initial_prompt=speakable(text), condition_on_previous_text=False)
    words = [w for s in segs for w in (s.words or [])]
    ref = _norm_words(speakable(text))
    # un mot whisper peut contenir plusieurs « mots normalisés » (ex. l'écho) : on garde l'index du mot source
    hyp, owner = [], []
    for i, w in enumerate(words):
        for n in _norm_words(w.word):
            hyp.append(n)
            owner.append(i)
    import difflib
    sm = difflib.SequenceMatcher(a=ref, b=hyp, autojunk=False)
    score = sm.ratio() if ref else 1.0
    # on ne garde que les mots whisper qui correspondent au texte (élimine les mots « inventés » en fin de phrase)
    blocks = [bl for bl in sm.get_matching_blocks() if bl.size]
    if blocks:
        first = owner[blocks[0].b]
        last = owner[blocks[-1].b + blocks[-1].size - 1]
        words = words[first:last + 1]
    return [w.word.strip() for w in words], [(w.start, w.end) for w in words], score


def synth_chatterbox(text: str, cfg: dict):
    import torch
    if "tts" not in _cb:
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        torch.set_num_threads(4)
        _cb["tts"] = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    tts = _cb["tts"]
    best = None
    for attempt in range(cfg.get("tries", 3)):
        torch.manual_seed(cfg.get("seed", 7) + attempt * 101)
        wav = tts.generate(
            speakable(text).replace(" ,", ","),
            language_id="fr",
            audio_prompt_path=str(ROOT / cfg["ref"]) if cfg.get("ref") else None,
            exaggeration=cfg.get("exaggeration", 0.6),
            cfg_weight=cfg.get("cfg", 0.4),
            temperature=cfg.get("temperature", 0.8),
        )
        a = wav.squeeze(0).numpy().astype(np.float32)
        a48 = pitch_resample(a, tts.sr, cfg.get("pitch", 1.0))
        speed = cfg.get("tempo", 1.0)
        if abs(speed - 1) > 1e-3:
            a48 = tempo(a48, speed)
        _, spans, score = align(a48, text)
        print(f"     essai {attempt + 1}: fidélité {score:.2f}")
        if best is None or score > best[2]:
            best = (a48, spans, score)
        if score >= 0.92:
            break
    a48, spans, score = best
    if not spans:
        return a48 * cfg.get("gain", 1.0), []
    # on coupe les silences / bruits avant le premier et après le dernier mot
    s0 = max(0.0, spans[0][0] - 0.06)
    s1 = min(len(a48) / SR, spans[-1][1] + 0.22)
    cut = a48[int(s0 * SR): int(s1 * SR)].copy()
    fade = int(0.04 * SR)
    cut[-fade:] *= np.linspace(1, 0, fade)
    spans = [(st - s0, en - s0) for st, en in spans]
    return cut * cfg.get("gain", 1.0), spans


def tempo(audio, speed):
    with tempfile.TemporaryDirectory() as td:
        i, o = Path(td) / "i.wav", Path(td) / "o.wav"
        sf.write(i, audio, SR)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(i), "-af",
                        f"rubberband=tempo={speed}", str(o)], check=True)
        out, _ = sf.read(o, dtype="float32")
    return out


def master(mix: np.ndarray) -> np.ndarray:
    """Traitement « voix de storytelling » : coupe-bas, présence, compression, -14 LUFS."""
    with tempfile.TemporaryDirectory() as td:
        i, o = Path(td) / "i.wav", Path(td) / "o.wav"
        sf.write(i, mix, SR)
        chain = ("highpass=f=80,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=3,"
                 "equalizer=f=9000:t=h:w=2000:g=2,"
                 "acompressor=threshold=-20dB:ratio=3.5:attack=5:release=120:makeup=4,"
                 "loudnorm=I=-14:TP=-1.5:LRA=7,aresample=48000")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(i), "-af", chain, "-ar", str(SR), str(o)], check=True)
        out, _ = sf.read(o, dtype="float32")
    return out


def map_words(tokens: list[str], spans: list[tuple[float, float]], dur: float):
    """Associe chaque mot affiché à un intervalle de temps."""
    if len(tokens) == len(spans):
        return spans
    # Repli : on répartit au prorata du nombre de lettres sur la zone parlée.
    s0 = spans[0][0] if spans else 0.0
    s1 = spans[-1][1] if spans else dur
    weights = [max(1, len(re.sub(r"\W", "", t))) for t in tokens]
    total = sum(weights)
    out, t = [], s0
    for w in weights:
        d = (s1 - s0) * w / total
        out.append((t, t + d))
        t += d
    print(f"   ⚠ {len(tokens)} mots / {len(spans)} groupes phonétiques → répartition proportionnelle")
    return out


def echo_fx(audio: np.ndarray, k: int) -> np.ndarray:
    """Version « écho de montagne » : plus faible, plus sourde, avec un peu de réverbe."""
    from scipy.signal import butter, lfilter
    b, a = butter(2, 2600 / (SR / 2), btype="low")
    x = lfilter(b, a, audio) * (0.62 ** k)
    tail = np.zeros(int(SR * 0.5), dtype=np.float32)
    x = np.concatenate([x, tail])
    for d, g in ((0.07, 0.35), (0.13, 0.22), (0.21, 0.12)):
        n = int(SR * d)
        x[n:] += x[:-n] * g
    return x.astype(np.float32)


def main():
    ep = sys.argv[1] if len(sys.argv) > 1 else "ep01"
    script_path = ROOT / "src" / "episodes" / ep / "script.json"
    script = json.loads(script_path.read_text())
    voices = script["voices"]

    clips: dict[str, tuple[np.ndarray, list]] = {}
    placed: list[tuple[float, np.ndarray]] = []
    timeline = []
    t = LEAD_IN

    for line in script["lines"]:
        who = line["who"]
        tokens = display_tokens(line["text"])
        if who == "echo":
            src_audio, src_words = clips[line["of"]]
            gap = line.get("gap", 0.4)
            src_len = src_words[-1][1] - src_words[0][0] if src_words else len(src_audio) / SR
            start0 = t - 0.05
            words = []
            for k in range(1, line.get("repeats", 3) + 1):
                st = start0 + (k - 1) * (src_len + gap)
                placed.append((st - src_words[0][0], echo_fx(src_audio, k)))
                words.append({"text": tokens[0] if tokens else "…", "start": round(st, 3),
                              "end": round(st + src_len, 3), "echo": k})
            end = words[-1]["end"]
            print(f"  {line['id']:<14} echo ×{len(words)}")
        else:
            cfg = dict(voices[who])
            if "speed" in line:  # réglage de débit pour une réplique (1 = normal)
                cfg["lengthScale"] = cfg.get("lengthScale", 1.0) / line["speed"]
            # "say" : texte prononcé différent du texte affiché (prononciation)
            audio, spans = synth_line(line.get("say", line["text"]), cfg)
            clips[line["id"]] = (audio, spans)
            dur = len(audio) / SR
            if "say" in line and len(display_tokens(line["say"])) != len(tokens):
                spans = map_words(tokens, [(spans[0][0], spans[-1][1])] if spans else [], dur)
            else:
                spans = map_words(tokens, spans, dur)
            placed.append((t, audio))
            words = [{"text": tok, "start": round(t + s, 3), "end": round(t + e, 3)}
                     for tok, (s, e) in zip(tokens, spans)]
            # fin = fin du dernier mot (on ignore le silence de queue du TTS)
            end = t + (spans[-1][1] if spans else dur)
            print(f"  {line['id']:<14} {dur:5.2f}s  {line['text']}", flush=True)
        entry = {k: v for k, v in line.items() if k not in ("text",)}
        entry.update({"text": line["text"], "start": round(words[0]["start"] if words else t, 3),
                      "end": round(end, 3), "words": words})
        timeline.append(entry)
        t = end + line.get("pause", 0.2)

    total = t + 0.3
    mix = np.zeros(int(SR * (total + 2)), dtype=np.float32)
    for st, a in placed:
        i = max(0, int(st * SR))
        mix[i:i + len(a)] += a[: len(mix) - i]
    mix = mix[: int(SR * total)]
    peak = np.max(np.abs(mix)) or 1
    mix = mix / peak * 0.89
    if script.get("master", True):
        mix = master(mix)[: int(SR * total)]

    out_dir = ROOT / "public" / ep
    out_dir.mkdir(parents=True, exist_ok=True)
    sf.write(out_dir / "voice.wav", mix, SR, subtype="PCM_16")
    (ROOT / "src" / "episodes" / ep / "timeline.json").write_text(
        json.dumps({"duration": round(total, 3), "lines": timeline}, ensure_ascii=False, indent=1))
    print(f"\n✔ voix : {out_dir / 'voice.wav'}  ({total:.1f} s)")


if __name__ == "__main__":
    main()
