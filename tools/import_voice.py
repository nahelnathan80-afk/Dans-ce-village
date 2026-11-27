#!/usr/bin/env python3
"""Monte une voix off à partir de fichiers audio existants (ex. ElevenLabs) et calcule
les timestamps de chaque mot du script par alignement whisper.

Usage : <python du venv> tools/import_voice.py ep02

Lit src/episodes/<ep>/voice-plan.json :
  {"gap": 0.25, "parts": [{"file": "assets/voix/ep02/segA.mp3", "lines": ["hook-1", ...]}, ...]}
Chaque fichier contient, dans l'ordre, les répliques listées (texte « say » si présent).
Sorties : public/<ep>/voice.wav et src/episodes/<ep>/timeline.json (même format que tts.py).
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
import tts  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SR = tts.SR


def load(path: Path, tempo: float = 1.0) -> np.ndarray:
    """Charge un fichier audio (mono 48 kHz). `tempo` > 1 accélère sans changer la hauteur (atempo)."""
    with tempfile.TemporaryDirectory() as td:
        o = Path(td) / "o.wav"
        af = ["-af", f"atempo={tempo}"] if abs(tempo - 1) > 1e-3 else []
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(path), *af, "-ac", "1", "-ar", str(SR), str(o)], check=True)
        a, _ = sf.read(o, dtype="float32")
    return a


def whisper_words(a: np.ndarray, prompt: str):
    from scipy.signal import resample_poly
    a16 = resample_poly(a, 1, 3).astype(np.float32)
    segs, _ = tts._whisper().transcribe(a16, language="fr", word_timestamps=True, beam_size=5,
                                        condition_on_previous_text=False)
    out = []
    for s in segs:
        for w in s.words or []:
            for n in tts._norm_words(w.word):
                out.append((n, w.start, w.end))
    return out


def letters(tok: str) -> int:
    return max(1, len("".join(tts._norm_words(tok))))


def main():
    ep = sys.argv[1] if len(sys.argv) > 1 else "ep02"
    ep_dir = ROOT / "src" / "episodes" / ep
    script = json.loads((ep_dir / "script.json").read_text())
    plan = json.loads((ep_dir / "voice-plan.json").read_text())
    by_id = {l["id"]: l for l in script["lines"]}
    gap = plan.get("gap", 0.25)

    pieces = []
    timeline = {}
    t = tts.LEAD_IN
    for part in plan["parts"]:
        a = load(ROOT / part["file"], plan.get("tempo", 1.0))
        # on retire le silence de début/fin du fichier
        thr = 0.02 * np.max(np.abs(a))
        idx = np.where(np.abs(a) > thr)[0]
        a = a[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.12 * SR)]
        lines = [by_id[i] for i in part["lines"]]
        said = [tts.speakable(l.get("say", l["text"])) for l in lines]
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
        print(f"  {part['file']}: {len(a) / SR:.1f}s, {len(match)}/{len(ref)} mots alignés ({sm.ratio():.2f})", flush=True)
        dur = len(a) / SR
        # bornes de chaque réplique (temps whisper des mots reconnus)
        spans = []
        for li in range(len(lines)):
            ri = [i for i, o in enumerate(owner) if o == li]
            hj = [match[i] for i in ri if i in match]
            if hj:
                spans.append((hyp[min(hj)][1], hyp[max(hj)][2], hj))
            else:
                spans.append(None)
        # répliques non reconnues : interpolées entre leurs voisines
        for li, sp in enumerate(spans):
            if sp is None:
                prev_end = next((spans[k][1] for k in range(li - 1, -1, -1) if spans[k]), 0.0)
                next_start = next((spans[k][0] for k in range(li + 1, len(spans)) if spans[k]), dur)
                spans[li] = (prev_end + 0.05, max(prev_end + 0.3, next_start - 0.05), [])
                print(f"   ⚠ {lines[li]['id']} non reconnu → interpolé", flush=True)
        rel = []  # (réplique, s0, s1, mots en temps relatifs au fichier)
        for li, line in enumerate(lines):
            s0, s1, hj = spans[li]
            toks = tts.display_tokens(line["text"])
            # repère lettres → temps à partir des mots whisper de la réplique
            if hj:
                ws = [hyp[j] for j in range(min(hj), max(hj) + 1)]
                tot = sum(len(w[0]) for w in ws)
                xs, ys, c = [], [], 0
                for w in ws:
                    xs.append(c / tot)
                    ys.append(w[1])
                    c += len(w[0])
                    xs.append(c / tot)
                    ys.append(w[2])
            else:
                xs, ys = [0, 1], [s0, s1]
            weights = [letters(tk) for tk in toks]
            totw = sum(weights)
            c = 0
            words = []
            for tk, wgt in zip(toks, weights):
                st = float(np.interp(c / totw, xs, ys))
                en = float(np.interp((c + wgt) / totw, xs, ys))
                words.append((tk, st, max(en, st + 0.06)))
                c += wgt
            rel.append((line, s0, s1, words))

        def place(line, words, offset):
            entry = {k: v for k, v in line.items() if k != "text"}
            ws = [{"text": tk, "start": round(offset + st, 3), "end": round(offset + en, 3)} for tk, st, en in words]
            entry.update({"text": line["text"], "start": ws[0]["start"], "end": ws[-1]["end"], "words": ws})
            timeline[line["id"]] = entry

        if plan.get("split", False):
            # on redécoupe le fichier réplique par réplique et on applique les pauses du scénario
            for li, (line, s0, s1, words) in enumerate(rel):
                prev_end = rel[li - 1][2] if li else 0.0
                next_start = rel[li + 1][1] if li + 1 < len(rel) else dur
                c0 = max(prev_end + 0.02, s0 - 0.1)
                c1 = min(next_start - 0.02, s1 + 0.18)
                seg = a[int(c0 * SR): int(c1 * SR)].copy()
                fade = min(len(seg) // 4, int(0.03 * SR))
                if fade:
                    seg[:fade] *= np.linspace(0, 1, fade)
                    seg[-fade:] *= np.linspace(1, 0, fade)
                place(line, words, t - c0)
                pieces.append((t, seg))
                if plan.get("export"):  # un fichier par réplique (planXX.mp3)
                    ex = ROOT / plan["export"]
                    ex.mkdir(parents=True, exist_ok=True)
                    with tempfile.TemporaryDirectory() as td:
                        w = Path(td) / "s.wav"
                        sf.write(w, seg, SR)
                        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(w), "-b:a", "160k", str(ex / f"{line['id']}.mp3")], check=True)
                t += (s1 - c0) + line.get("pause", 0.3)
        else:
            for line, s0, s1, words in rel:
                place(line, words, t)
            pieces.append((t, a))
            t += dur + gap

    total = t + 0.6
    mix = np.zeros(int(SR * total) + SR, dtype=np.float32)
    for st, a in pieces:
        i = int(st * SR)
        mix[i:i + len(a)] += a
    mix = mix[: int(SR * total)]
    mix = mix / (np.max(np.abs(mix)) or 1) * 0.89
    mix = tts.master(mix)[: int(SR * total)]
    out = ROOT / "public" / ep
    out.mkdir(parents=True, exist_ok=True)
    sf.write(out / "voice.wav", mix, SR, subtype="PCM_16")
    ordered = [timeline[l["id"]] for l in script["lines"] if l["id"] in timeline]
    (ep_dir / "timeline.json").write_text(json.dumps({"duration": round(total, 3), "lines": ordered}, ensure_ascii=False, indent=1))
    print(f"✔ voix : {out / 'voice.wav'} ({total:.1f} s), {len(ordered)}/{len(script['lines'])} répliques")


if __name__ == "__main__":
    main()
