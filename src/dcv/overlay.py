"""Finition d'un plan : étalonnage, incrustations 2D, encodage du clip.

Pour chaque image du plan :
  - reprend l'image rendue par Blender (en aperçu, 1 image sur 2 → doublée) ;
  - étalonnage de l'ambiance (gain RVB + saturation, cf. moods.py) ;
  - mise à la taille de sortie (réduction = lissage des contours) ;
  - incrustations calées sur la position des têtes (meta.json) :
      * étiquette de nom dans une pastille arrondie (LÉO, MAMAN…)
      * bulles BD (répliques, onomatopées) avec pointe vers le personnage
      * pensées « ? » / « … » au-dessus de la tête
    toujours dans les zones sûres TikTok (ni dans les 15 % du bas, ni dans la
    colonne de droite, ni sur la bande des sous-titres) ;
puis encode le clip vidéo du plan (H.264, sans son).
"""
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import config
from . import moods as MO
from . import fx, hud
from .textures import font

SUB_TOP = 0.54        # bande réservée aux sous-titres : 54 % → 72 %
SUB_BOT = 0.72


def _grade(im, m):
    a = np.asarray(im, dtype=np.float32) / 255.0
    g = np.array(m.get("grade", (1, 1, 1)), dtype=np.float32)
    a = a * g
    sat = m.get("sat", 1.0)
    if sat != 1.0:
        lum = (a * np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)).sum(axis=2, keepdims=True)
        a = lum + (a - lum) * sat
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def _pop(t, t0, t1, dur=0.18):
    """Facteur d'apparition/disparition (0..1) avec petit rebond."""
    if t < t0 or t > t1:
        return 0.0
    a = min(1.0, (t - t0) / dur)
    b = min(1.0, (t1 - t) / 0.15)
    s = a if a >= 1 else (1 - (1 - a) ** 3) * (1 + 0.12 * math.sin(a * math.pi))
    return max(0.0, min(s, b))


HUD_BAS = [0.0]      # bas de la pastille du haut (fraction de H), 0 si pas de pastille


def _clamp_box(x0, y0, w, h, W, H, avoid_subs=True):
    xmin, xmax = config.SAFE_LEFT * W, config.SAFE_RIGHT * W
    ymin = max(config.SAFE_TOP, HUD_BAS[0]) * H
    ymax = (SUB_TOP * H) if avoid_subs else config.SAFE_BOTTOM * H
    x0 = min(max(x0, xmin), xmax - w)
    y0 = min(max(y0, ymin), ymax - h)
    return x0, y0


def _wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if d.textlength(test, font=f) <= maxw or not cur:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return "\n".join(lines)


def draw_label(d, k, cx, cy, text, s, color=(255, 210, 31)):
    """Pastille arrondie avec le nom (cx, cy = bas-centre de la pastille)."""
    f = font(int(46 * k * (0.7 + 0.3 * s)), black=True)
    tw = d.textlength(text, font=f)
    pw, ph = tw + 56 * k, 78 * k * (0.7 + 0.3 * s)
    W, H = d.im.size
    x0, y0 = _clamp_box(cx - pw / 2, cy - ph, pw, ph, W, H)
    d.rounded_rectangle([x0, y0, x0 + pw, y0 + ph], radius=ph / 2, fill=(255, 255, 255, int(255 * s)),
                        outline=(20, 20, 30, int(255 * s)), width=max(2, int(6 * k)))
    d.text((x0 + pw / 2, y0 + ph / 2), text, font=f, fill=(20, 20, 30, int(255 * s)), anchor="mm")


def draw_bubble(d, k, head, text, s, thought=False, head_px=120, cpt_y=None):
    """Bulle BD blanche à contour noir, À CÔTÉ de la tête (pour ne pas cacher
    le compteur), avec une pointe vers la bouche. head = centre de la tête (px)."""
    W, H = d.im.size
    big = thought and len(text) <= 2
    f = font(int((96 if big else 48) * k), black=True)
    txt = text if big else _wrap(d, text, f, 520 * k)
    bb = d.multiline_textbbox((0, 0), txt, font=f, spacing=int(8 * k), align="center")
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    pad = 30 * k
    bw, bh = tw + 2 * pad, th + 2 * pad
    if big:
        bw = bh = max(bw, bh)
    hx, hy = head
    xmin, xmax = config.SAFE_LEFT * W, config.SAFE_RIGHT * W
    off = head_px * 0.45 + 16 * k
    above = False
    room_r, room_l = xmax - (hx + off), (hx - off) - xmin
    if max(room_r, room_l) >= bw * 0.8:
        if room_r >= room_l:
            bx = hx + off
        else:
            bx = hx - off - bw
        by = hy - head_px * 0.45 - bh
    else:
        # gros plan : pas de place sur les côtés → juste au-dessus de la tête,
        # décalée vers le côté le plus libre (le visage reste visible)
        bx = hx - bw / 2 + (0.25 if room_r >= room_l else -0.25) * bw
        by = hy - head_px * 0.5 - bh
        above = True
    bx, by = _clamp_box(bx, by, bw, bh, W, H)
    a = int(255 * s)
    cx, cy = bx + bw / 2, by + bh / 2
    sc = 0.6 + 0.4 * s
    x0, y0, x1, y1 = cx - bw / 2 * sc, cy - bh / 2 * sc, cx + bw / 2 * sc, cy + bh / 2 * sc
    lw = max(3, int(7 * k))
    ink = (20, 20, 30, a)
    white = (255, 255, 255, a)
    # pointe vers la bouche (ou le bord de la tête)
    tipx = hx + (-1 if cx < hx else 1) * head_px * 0.3
    tipy = hy + head_px * 0.1
    if above:                       # bulle au-dessus : la pointe touche le haut de la tête
        tipx, tipy = hx + (cx - hx) * 0.3, hy - head_px * 0.42
    tipy = min(tipy, H * SUB_TOP)
    if thought:
        for i, r in enumerate((15, 10, 6)):
            px = cx + (tipx - cx) * (0.45 + 0.2 * i)
            py = cy + (hy - head_px * 0.5 - cy) * (0.45 + 0.2 * i)
            r *= k * sc
            d.ellipse([px - r, py - r, px + r, py + r], fill=white, outline=ink, width=lw)
        d.ellipse([x0, y0, x1, y1], fill=white, outline=ink, width=lw)
    else:
        # base de la pointe sur le bord de la bulle le plus proche de la tête
        bxm = min(max(tipx, x0 + 50 * k), x1 - 50 * k)
        bym = min(max(tipy, y0 + 40 * k), y1 - 40 * k)
        if tipy > y1:
            base = [(bxm - 26 * k, y1 - lw), (bxm + 26 * k, y1 - lw)]
        elif tipx < x0:
            base = [(x0 + lw, bym - 24 * k), (x0 + lw, bym + 24 * k)]
        else:
            base = [(x1 - lw, bym - 24 * k), (x1 - lw, bym + 24 * k)]
        d.polygon(base + [(tipx, tipy)], fill=white, outline=ink, width=lw)
        d.rounded_rectangle([x0, y0, x1, y1], radius=36 * k * sc, fill=white, outline=ink, width=lw)
        # recouvre le trait entre bulle et pointe
        mx, my = (base[0][0] + base[1][0]) / 2, (base[0][1] + base[1][1]) / 2
        inner = [(base[0][0] + (mx - base[0][0]) * 0.15, base[0][1] + (my - base[0][1]) * 0.15),
                 (base[1][0] + (mx - base[1][0]) * 0.15, base[1][1] + (my - base[1][1]) * 0.15)]
        d.polygon(inner + [(mx + (tipx - mx) * 0.35, my + (tipy - my) * 0.35)], fill=white)
    if s > 0.3:
        f2 = font(max(8, int(f.size * sc)), black=True)
        d.multiline_text((cx, cy), txt, font=f2, fill=ink, anchor="mm", align="center", spacing=int(8 * k))


def compose(img, f, meta, spec, W, H):
    """Ajoute étiquettes, pensées et bulles sur l'image f (déjà étalonnée)."""
    k = W / 1080
    t = (f - 1) / config.FPS
    HUD_BAS[0] = 0.19 if spec.get("hud") else 0.0
    fr = meta["frames"][f - 1] if f - 1 < len(meta["frames"]) else {}
    if spec.get("meteo") == "pluie":
        img = fx.pluie(img, t, seed=spec.get("index", 0))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    drew = False
    # dormeurs : « Z z z » au-dessus de la tête
    for n, pz in fr.items():
        if pz.get("zzz") and pz["z"] > 0 and 0 < pz["top"][0] < 1 and 0 < pz["top"][1] < 1:
            fx.zzz(d, k, pz["top"][0] * W + 20 * k, pz["top"][1] * H, t, seed=len(n))
            drew = True

    def pos(qui, key):
        p = fr.get(qui)
        if not p or p["z"] <= 0:
            return None
        return (p[key][0] * W, p[key][1] * H)

    def head_px(qui):
        p = fr.get(qui)
        return max(40 * k, p["taille"] * H * 2.2) if p else 120 * k

    for e in spec["etiquettes"]:
        s = _pop(t, e["t0"], e["t1"])
        p = pos(e["qui"], "cpt")
        if s > 0 and p and 0 < p[0] < W and -0.2 * H < p[1] < H and not fr[e["qui"]].get("dos"):
            x, y = p[0], p[1] - 14 * k
            if y - 80 * k < config.SAFE_TOP * H:        # compteur trop haut : à côté du visage
                h = pos(e["qui"], "tete")
                hp = head_px(e["qui"])
                x = h[0] - hp * 0.5 - 110 * k if h[0] > W * 0.4 else h[0] + hp * 0.5 + 110 * k
                y = h[1] + 40 * k
            draw_label(d, k, x, y, e["texte"], s)
            drew = True
    for b in spec["pensees"]:
        s = _pop(t, b["t0"], b["t1"])
        p = pos(b["qui"], "tete")
        c = pos(b["qui"], "cpt")
        if s > 0 and p and 0 < p[0] < W and not fr[b["qui"]].get("dos"):
            draw_bubble(d, k, (p[0], p[1] + 6 * k * math.sin(t * 4)), b["texte"], s, thought=True,
                        head_px=head_px(b["qui"]), cpt_y=c[1] if c else None)
            drew = True
    for b in spec["bulles"]:
        s = _pop(t, b["t0"], b["t1"])
        if s <= 0:
            continue
        p = pos(b["qui"], "tete") or (W * 0.3, H * 0.45)
        p = (min(max(p[0], 0), W), min(max(p[1], 0), H))
        c = pos(b["qui"], "cpt")
        draw_bubble(d, k, p, b["texte"], s, head_px=head_px(b["qui"]), cpt_y=c[1] if c else None)
        drew = True
    out = img
    if drew:
        out = img.convert("RGBA")
        out.alpha_composite(layer)
    if spec.get("hud"):
        out = hud.draw(out, spec["hud"], t, spec["duree"])
    out = out.convert("RGB")
    if spec.get("transition") == "flash":
        out = fx.flash(out, t)
    elif spec.get("transition") == "rembobinage":
        out = fx.rembobinage(out, t)
    return out


def load_frame(frames_dir, f, W, H, mood):
    src = f
    while src >= 1 and not (frames_dir / f"f_{src:04d}.png").exists():
        src -= 1
    if src < 1:
        raise RuntimeError(f"image manquante {frames_dir}/f_{f:04d}.png")
    im = Image.open(frames_dir / f"f_{src:04d}.png").convert("RGB")
    if im.size != (W, H):
        im = im.resize((W, H), Image.LANCZOS)
    return src, _grade(im, mood)


def finish_plan(frames_dir: Path, meta_path: Path, spec: dict, plan: dict, n_frames: int, mode: dict, out_mp4: Path):
    W, H = mode["out"]
    meta = json.loads(Path(meta_path).read_text())
    mood = MO.get(plan["mood"])
    fps = config.FPS
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps),
           "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", str(max(14, mode["crf"] - 4)), "-pix_fmt", "yuv420p",
           "-r", str(fps), str(out_mp4)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    last_src, last_img = None, None
    for f in range(1, n_frames + 1):
        src = f
        while src >= 1 and not (frames_dir / f"f_{src:04d}.png").exists():
            src -= 1
        if src != last_src:
            last_src, last_img = load_frame(frames_dir, f, W, H, mood)
        proc.stdin.write(compose(last_img, f, meta, spec, W, H).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError("ffmpeg a échoué pendant l'encodage du plan")
