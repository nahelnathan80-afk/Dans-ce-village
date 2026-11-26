"""Chef d'orchestre : scénario → vidéo finale.

  python -m dcv.build <nom> [apercu|final] [--plans plan01,plan05] [--controle]

Étapes : voix (MP3 / ElevenLabs / temporaire) → durées → timing des mots →
rendu de chaque plan (avec cache) → finition des clips → sous-titres →
mixage audio → montage → rapport.

Cache (dossier cache/, jamais commité) :
  - un plan est identifié par une EMPREINTE : JSON du plan + timing + mode +
    fichiers utilisés (personnages, code des décors/personnages/caméra…).
    Plan inchangé → pas de nouveau rendu.
  - un rendu interrompu reprend où il s'était arrêté (images déjà présentes
    conservées, image éventuellement tronquée supprimée).
--controle : ne rend qu'1 image au milieu de chaque cadrage → planches
             output/<nom>/controle/<plan>.jpg pour vérifier vite les cadrages.
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw

from . import align, audio, config, montage, overlay, scenario, subtitles, timing, tts
from . import moods as MO

SRC = Path(__file__).resolve().parent
# code dont dépend l'IMAGE rendue par Blender
RENDER_CODE = ["render_shot.py", "scene.py", "characters.py", "actions.py", "camera.py", "moods.py",
               "crowd.py", "props.py", "textures.py", "faces.py", "sets"]
OVERLAY_CODE = ["overlay.py", "textures.py", "moods.py"]


def _code_hash(names):
    h = hashlib.sha256()
    for n in names:
        p = SRC / n
        files = sorted(p.rglob("*.py")) if p.is_dir() else [p]
        for f in files:
            h.update(f.read_bytes())
    return h.hexdigest()


def _file_hash(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest() if p and Path(p).exists() else "-"


def _clean_json(o):
    """Le plan sans les clés internes, mais avec le contenu des personnages."""
    if isinstance(o, dict):
        return {k: _clean_json(v) for k, v in o.items() if k not in ("_fichier",)}
    if isinstance(o, list):
        return [_clean_json(v) for v in o]
    return o


def plan_hashes(plan, spec, mode_name, n_frames):
    render_part = {
        "plan": _clean_json(plan), "duree": spec["duree"], "cadrages": spec["cadrages"],
        "mode": config.MODES[mode_name], "n": n_frames, "code": _code_hash(RENDER_CODE),
    }
    autel = plan.get("autel")
    if autel:
        render_part["photo"] = _file_hash(config.PERSONNAGES / f"{autel.get('photo', 'leo')}.json")
    rh = hashlib.sha256(json.dumps(render_part, sort_keys=True, default=str).encode()).hexdigest()[:16]
    over = {"r": rh, "b": spec["bulles"], "e": spec["etiquettes"], "p": spec["pensees"],
            "code": _code_hash(OVERLAY_CODE), "mood": MO.get(plan["mood"])}
    oh = hashlib.sha256(json.dumps(over, sort_keys=True, default=str).encode()).hexdigest()[:16]
    return rh, oh


def _repair_frames(frames_dir: Path):
    """Supprime une image tronquée (rendu interrompu)."""
    n_ok = 0
    for p in sorted(frames_dir.glob("f_*.png")):
        try:
            if p.stat().st_size < 200:
                raise OSError
            with Image.open(p) as im:
                im.verify()
            n_ok += 1
        except Exception:
            p.unlink(missing_ok=True)
    return n_ok


def blender_env():
    env = dict(os.environ)
    env["EGL_PLATFORM"] = "surfaceless"      # Eevee sans écran via Mesa
    env["PYTHONPATH"] = str(SRC.parent) + os.pathsep + env.get("PYTHONPATH", "")
    return env


def run_blender(job_path, log_path):
    with open(log_path, "a") as lf:
        r = subprocess.run([sys.executable, "-m", "dcv.render_shot", str(job_path)],
                           cwd=str(SRC.parent), env=blender_env(), stdout=lf, stderr=subprocess.STDOUT)
    if r.returncode != 0:
        tail = Path(log_path).read_text(errors="ignore").splitlines()[-25:]
        raise RuntimeError("Blender a échoué :\n" + "\n".join(tail))


def fmt(s):
    s = int(round(s))
    return f"{s // 60} min {s % 60:02d} s" if s >= 60 else f"{s} s"


def checklist(sc, specs):
    """Vérifications automatiques demandées pour chaque épisode."""
    res = []
    first = next((p["voix"]["texte"] for p in sc["plans"] if p.get("voix")), "")
    res.append(("1re phrase commence par « Dans cette ville, »", scenario.plain_text(first).startswith("Dans cette ville,"), ""))
    longest, lw = "", 0
    for p in sc["plans"]:
        if p.get("voix"):
            for ph in re.split(r"(?<=[.!?…])\s+", scenario.plain_text(p["voix"]["texte"])):
                n = len([w for w in ph.split() if re.search(r"\w", w)])
                if n > lw:
                    lw, longest = n, ph
    res.append(("Aucune phrase de plus de 12 mots", lw <= 12, f"max {lw} mots : « {longest} »"))
    mx = max(c["t1"] - c["t0"] for s in specs for c in s["cadrages"])
    res.append(("Un cadrage change au moins toutes les 2 s", mx <= 2.0 + 1e-3, f"cadrage le plus long : {mx:.2f} s"))
    return res


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("nom")
    ap.add_argument("mode", nargs="?", default="apercu", choices=list(config.MODES))
    ap.add_argument("--plans", default="")
    ap.add_argument("--controle", action="store_true")
    a = ap.parse_args(argv)
    T0 = time.time()
    mode = config.MODES[a.mode]
    sc = scenario.load_episode(a.nom)
    ep_cache = config.CACHE / a.nom
    out_dir = config.OUTPUT / a.nom
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"▶ Épisode « {sc.get('titre', a.nom)} » — mode {a.mode} — {len(sc['plans'])} plans")

    # 1. voix
    voix = {}
    for i, p in enumerate(sc["plans"]):
        mp3, origine = tts.ensure_voice(sc, p, i)
        d = tts.duration(mp3) if mp3 else None
        voix[p["id"]] = (mp3, d, origine)
        print(f"  {p['id']} voix : {origine}" + (f" ({d:.2f} s)" if d else ""))

    # 2. durées et cadrages
    specs = timing.build_timeline(sc, voix)
    fade_frames = round(config.FONDU_PLANS * config.FPS)
    fade = fade_frames / config.FPS
    total = specs[-1]["debut"] + specs[-1]["duree"] + specs[-1]["noir"]
    print(f"  durée totale : {total:.1f} s")

    # 3. timing des mots
    entries = []
    for s, p in zip(specs, sc["plans"]):
        if s["voix_mp3"]:
            mots, methode = align.align(Path(s["voix_mp3"]), p["voix"]["texte"], p["id"], a.nom, s["voix_duree"])
            s["align"] = methode
            entries.append((s["debut"] + config.VOIX_DEBUT, mots, s["debut"] + s["duree"]))

    # 4. rendu des plans
    only = set(x for x in a.plans.split(",") if x)
    clips, rapport = [], []
    for i, (p, s) in enumerate(zip(sc["plans"], specs)):
        last = i == len(specs) - 1
        n_frames = round(s["duree"] * config.FPS) + (0 if last else fade_frames)
        rh, oh = plan_hashes(p, s, a.mode, n_frames)
        work = ep_cache / a.mode / f"{p['id']}_{rh}"
        frames = work / "frames"
        clip = work / f"clip_{oh}.mp4"
        clips.append(clip)
        if only and p["id"] not in only:
            continue
        t_plan = time.time()
        job = {"plan": p, "spec": s, "fps": config.FPS, "n_frames": n_frames, "mode": mode,
               "work_dir": str(work), "frames_dir": str(frames)}
        work.mkdir(parents=True, exist_ok=True)
        if a.controle:
            mids = sorted({max(1, min(n_frames, round((c["t0"] + c["t1"]) / 2 * config.FPS))) for c in s["cadrages"]})
            for m in mids:
                (frames / f"f_{m:04d}.png").unlink(missing_ok=True)
            job["only_frames"] = mids
            job["frames_dir"] = str(work / "controle")
            jp = work / "job_controle.json"
            jp.write_text(json.dumps(job, ensure_ascii=False, default=str))
            run_blender(jp, work / "blender.log")
            _contact_sheet(work, mids, s, p, mode, out_dir / "controle" / f"{p['id']}.jpg")
            print(f"  {p['id']} : planche de contrôle ({len(mids)} images) {fmt(time.time() - t_plan)}")
            continue
        status = "cache"
        if not (work / "rendu_ok").exists():
            n_ok = _repair_frames(frames) if frames.exists() else 0
            status = "reprise" if n_ok else "rendu"
            jp = work / "job.json"
            jp.write_text(json.dumps(job, ensure_ascii=False, default=str))
            print(f"  {p['id']} : {status} de {n_frames} images ({s['duree']:.2f} s, {len(s['cadrages'])} cadrages)…", flush=True)
            run_blender(jp, work / "blender.log")
            (work / "rendu_ok").write_text(time.strftime("%F %T"))
            (work / "temps_rendu.txt").write_text(f"{time.time() - t_plan:.1f}")
        if not clip.exists():
            for old in work.glob("clip_*.mp4"):
                old.unlink()
            overlay.finish_plan(frames, work / "meta.json", s, p, n_frames, mode, clip)
        t_render = float((work / "temps_rendu.txt").read_text()) if (work / "temps_rendu.txt").exists() else 0
        rapport.append((p["id"], s["duree"], len(s["cadrages"]), status, time.time() - t_plan, t_render))
        print(f"  {p['id']} : {status} — {fmt(time.time() - t_plan)}")
    if a.controle or only:
        print(f"Terminé en {fmt(time.time() - T0)}")
        return

    # 5. sous-titres
    ass = ep_cache / a.mode / f"{a.nom}.ass"
    subtitles.build_ass(entries, ass)

    # 6. son
    mus = Path(sc["_dir"]) / "musique.mp3"
    if not mus.exists():
        mus = config.MUSIQUE_DEFAUT
    wav = ep_cache / a.mode / "mix.wav"
    rms_min, _ = audio.mix(specs, total, mus, wav, sc["plans"])
    m4a = ep_cache / a.mode / "mix.m4a"
    audio.loudnorm(wav, m4a)

    # 7. montage
    out = out_dir / f"{a.nom}.mp4"
    montage.assemble(clips, specs, fade, total, ass, m4a, out, mode)
    lufs = audio.measure_lufs(out)
    size = out.stat().st_size / 1e6

    # 8. rapport
    lines = [f"Épisode {a.nom} — mode {a.mode} — {time.strftime('%F %T')}",
             f"Durée : {total:.1f} s — fichier : {out.relative_to(config.ROOT)} ({size:.1f} Mo) — son : {lufs:.1f} LUFS",
             "", "Plan     durée  cadrages  état      temps (dont rendu Blender)"]
    for pid, d, nc, st, tt, tr in rapport:
        lines.append(f"{pid:8s} {d:5.2f}s  {nc:^8d}  {st:8s}  {fmt(tt)} ({fmt(tr)})")
    lines += ["", f"Temps total : {fmt(time.time() - T0)}", "", "Checklist :"]
    for name, ok, info in checklist(sc, specs):
        lines.append(f"  [{'OK' if ok else '!!'}] {name}" + (f" — {info}" if info else ""))
    lines.append(f"  [{'OK' if rms_min > 1e-3 else '!!'}] Jamais de silence total (niveau mini {20 * __import__('math').log10(max(rms_min, 1e-9)):.0f} dBFS)")
    meth = {s.get("align") for s in specs if s.get("align")}
    lines.append(f"  [i] Timing des sous-titres : {', '.join(sorted(meth))}")
    lines.append(f"  [i] Voix : " + ", ".join(sorted({v[2] for v in voix.values() if v[0]})))
    txt = "\n".join(lines)
    (out_dir / f"rapport_{a.mode}.txt").write_text(txt + "\n")
    print("\n" + txt)


def _contact_sheet(work, mids, spec, plan, mode, out_jpg):
    """Planche : 1 image par cadrage, avec incrustations et zones sûres."""
    W, H = 540, 960
    meta = json.loads((work / "meta.json").read_text())
    mood = MO.get(plan["mood"])
    ims = []
    for m in mids:
        _, im = overlay.load_frame(work / "controle", m, W, H, mood)
        im = overlay.compose(im, m, meta, spec, W, H)
        d = ImageDraw.Draw(im)
        d.line([0, H * 0.85, W, H * 0.85], fill=(255, 0, 0), width=2)
        d.line([W * config.SAFE_RIGHT, 0, W * config.SAFE_RIGHT, H], fill=(255, 0, 0), width=2)
        d.rectangle([W * 0.08, H * 0.6, W * 0.85, H * 0.66], outline=(255, 255, 0), width=2)
        cam = meta["cameras"][m - 1]
        d.text((8, 8), f"{plan['id']} f{m} {cam}", fill=(255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0))
        ims.append(im)
    sheet = Image.new("RGB", (len(ims) * (W + 8), H), "white")
    for i, im in enumerate(ims):
        sheet.paste(im, (i * (W + 8), 0))
    out_jpg.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_jpg, quality=85)


if __name__ == "__main__":
    try:
        main()
    except scenario.ScenarioError as e:
        print(f"\n✖ {e}")
        sys.exit(2)
