"""Voix off d'un plan.

Ordre de priorité :
  1. episodes/<nom>/voix/planXX.mp3 déposé par toi (ElevenLabs depuis le site) ;
  2. ElevenLabs par l'API (voix « Grégory - dynamic ») si la clé est configurée
     dans l'environnement cloud — le MP3 est alors enregistré dans voix/ ;
  3. voix TEMPORAIRE locale gratuite : Piper, sinon espeak-ng → cache/<nom>/voix_temp/.
"""
import json
import shutil
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

from . import config
from .scenario import plain_text

_eleven_ok = None   # mémorise si l'API répond, pour ne pas réessayer 14 fois


def _run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, **kw)


def eleven_tts(texte: str, out_mp3: Path, prev: str = "", nxt: str = "", voice_id=None) -> bool:
    """Synthèse ElevenLabs. La clé est injectée par le proxy de l'environnement
    (en-tête xi-api-key), d'où la valeur fictive ici."""
    global _eleven_ok
    if _eleven_ok is False:
        return False
    body = {
        "text": texte,
        "model_id": config.ELEVEN_MODEL,
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True},
    }
    if prev:
        body["previous_text"] = prev
    if nxt:
        body["next_text"] = nxt
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id or config.ELEVEN_VOICE_ID}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "xi-api-key": "proxy-injected", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        out_mp3.parent.mkdir(parents=True, exist_ok=True)
        out_mp3.write_bytes(data)
        _eleven_ok = True
        return True
    except Exception as e:  # clé absente/invalide, quota, réseau…
        msg = e.read().decode(errors="ignore")[:200] if isinstance(e, urllib.error.HTTPError) else str(e)
        print(f"   [voix] ElevenLabs indisponible ({msg.strip()}) → voix temporaire locale")
        _eleven_ok = False
        return False


def piper_tts(texte: str, out_mp3: Path) -> bool:
    model = config.MODELS / "fr_FR-tom-medium.onnx"
    exe = shutil.which("piper") or str(Path(__import__("sys").executable).parent / "piper")
    if not model.exists() or not Path(exe).exists():
        return False
    wav = out_mp3.with_suffix(".wav")
    try:
        _run([exe, "-m", str(model), "-f", str(wav), "--length-scale", "1.05", "--sentence-silence", "0.25"],
             input=texte.encode())
        _run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-ar", "44100", "-b:a", "160k", str(out_mp3)])
        wav.unlink(missing_ok=True)
        return True
    except subprocess.CalledProcessError:
        return False


def espeak_tts(texte: str, out_mp3: Path) -> bool:
    if not shutil.which("espeak-ng"):
        return False
    wav = out_mp3.with_suffix(".wav")
    _run(["espeak-ng", "-v", "fr-fr", "-s", "150", "-w", str(wav), texte])
    _run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-ar", "44100", "-b:a", "160k", str(out_mp3)])
    wav.unlink(missing_ok=True)
    return True


def ensure_voice(sc: dict, plan: dict, idx: int) -> tuple[Path | None, str]:
    """Renvoie (chemin du MP3, origine) pour le plan, en le créant si besoin.
    « vitesse_voix » (épisode ou plan, ex. 1.12) accélère la voix sans changer
    sa hauteur (atempo) et resserre les silences de début/fin."""
    path, origine = _ensure_voice(sc, plan, idx)
    vit = float(plan.get("vitesse_voix", sc.get("vitesse_voix", 1.0)))
    if path is None or abs(vit - 1.0) < 1e-3:
        return path, origine
    out = config.CACHE / sc["_nom"] / "voix_vite" / f"{plan['id']}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    key = out.with_suffix(".txt")
    sig = f"{vit}|{Path(path).stat().st_size}|{Path(path).stat().st_mtime_ns}"
    if not (out.exists() and key.exists() and key.read_text() == sig):
        trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05"
        af = f"{trim},areverse,{trim},areverse,atempo={vit:.3f}"
        _run(["ffmpeg", "-y", "-v", "error", "-i", str(path), "-af", af, "-ar", "44100", "-b:a", "192k", str(out)])
        key.write_text(sig)
    return out, f"{origine} ×{vit:g}"


def _ensure_voice(sc: dict, plan: dict, idx: int) -> tuple[Path | None, str]:
    v = plan.get("voix")
    if not v:
        return None, "aucune"
    ep_dir = Path(sc["_dir"])
    real = ep_dir / v["fichier"]
    if real.exists():
        return real, "mp3 fourni"
    texte = plain_text(v["texte"])
    # contexte (phrases voisines) pour une intonation continue chez ElevenLabs
    plans = sc["plans"]
    prev = next((plain_text(p["voix"]["texte"]) for p in reversed(plans[:idx]) if p.get("voix")), "")
    nxt = next((plain_text(p["voix"]["texte"]) for p in plans[idx + 1:] if p.get("voix")), "")
    voice_id = (sc.get("voix_off") or {}).get("elevenlabs_voice_id")
    if (sc.get("voix_off") or {}).get("elevenlabs", True) and eleven_tts(texte, real, prev, nxt, voice_id):
        return real, "ElevenLabs (API)"
    tmp = config.CACHE / sc["_nom"] / "voix_temp" / f"{plan['id']}.mp3"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    key = tmp.with_suffix(".txt")
    if tmp.exists() and key.exists() and key.read_text() == texte:
        return tmp, "temporaire (cache)"
    for fn, name in ((piper_tts, "temporaire Piper"), (espeak_tts, "temporaire espeak-ng")):
        if fn(texte, tmp):
            key.write_text(texte)
            return tmp, name
    raise RuntimeError("Aucun TTS disponible : lance ./scripts/setup.sh")


def duration(path: Path) -> float:
    r = _run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(r.stdout.decode().strip())
