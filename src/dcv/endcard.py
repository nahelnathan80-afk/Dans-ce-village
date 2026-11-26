"""Carte-question finale (réutilisable) : la dernière image de l'épisode, floutée et
assombrie, une grande carte blanche arrondie qui « pop » avec la question en gros,
puis un bandeau « RÉPONDS EN COMMENTAIRE » qui pulse (et une petite bulle de
commentaire dessinée). Tout reste dans les zones sûres TikTok.
"""
import math
import subprocess

from PIL import Image, ImageDraw, ImageFilter

from . import config
from .textures import fit_text, font


def _comment_icon(d, x, y, s, col):
    d.rounded_rectangle([x, y, x + s * 1.4, y + s], radius=s * 0.3, fill=col)
    d.polygon([(x + s * 0.3, y + s * 0.9), (x + s * 0.7, y + s * 0.9), (x + s * 0.25, y + s * 1.35)], fill=col)
    for i in range(3):
        cx = x + s * (0.38 + 0.32 * i)
        d.ellipse([cx - s * 0.09, y + s * 0.41, cx + s * 0.09, y + s * 0.59], fill=(24, 30, 52, 255))


def frame(bg, carte, t, W, H):
    k = W / 1080
    blur = bg.filter(ImageFilter.GaussianBlur(18 * k)).convert("RGB")
    dark = Image.blend(blur, Image.new("RGB", bg.size, (12, 14, 30)), min(0.55, t * 1.5))
    im = dark.convert("RGBA")
    d = ImageDraw.Draw(im)
    a = min(1.0, t / 0.35)
    sc = 0.6 + 0.4 * (1 - (1 - a) ** 3) + 0.05 * math.sin(a * math.pi)
    cw, ch = 820 * k * sc, 760 * k * sc
    cx, cy = 0.45 * W, 0.40 * H
    x0, y0 = cx - cw / 2, cy - ch / 2
    d.rounded_rectangle([x0 + 14 * k, y0 + 18 * k, x0 + cw + 14 * k, y0 + ch + 18 * k], radius=60 * k * sc, fill=(0, 0, 0, 110))
    d.rounded_rectangle([x0, y0, x0 + cw, y0 + ch], radius=60 * k * sc, fill=(255, 255, 255, 255),
                        outline=(120, 220, 255, 255), width=max(4, int(12 * k * sc)))
    # pastille « ? » en haut de la carte
    r = 80 * k * sc
    d.ellipse([cx - r, y0 - r * 0.9, cx + r, y0 + r * 1.1], fill=(255, 210, 31, 255), outline=(24, 30, 52, 255), width=max(3, int(8 * k)))
    d.text((cx, y0 + r * 0.1), "?", font=font(int(110 * k * sc), True), fill=(24, 30, 52, 255), anchor="mm")
    if a > 0.4:
        q = carte.get("question", "")
        f, bb = fit_text(d, _wrap(q), cw - 120 * k, ch - 260 * k, int(110 * k), black=True)
        d.multiline_text((cx, y0 + ch * 0.52), _wrap(q), font=f, fill=(24, 30, 52, 255), anchor="mm",
                         align="center", spacing=int(f.size * 0.12))
    if t > 0.6:
        pulse = 1 + 0.05 * math.sin((t - 0.6) * 6)
        bw, bh = 780 * k * pulse, 120 * k * pulse
        by = 0.73 * H
        bx = cx - bw / 2
        d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=bh / 2, fill=(24, 30, 52, 245),
                            outline=(255, 210, 31, 255), width=max(3, int(7 * k)))
        _comment_icon(d, bx + 40 * k, by + bh / 2 - 32 * k, 64 * k, (255, 210, 31, 255))
        d.text((bx + 150 * k + (bw - 150 * k) / 2 - 20 * k, by + bh / 2), carte.get("appel", "RÉPONDS EN COMMENTAIRE"),
               font=font(int(46 * k * pulse), True), fill=(255, 255, 255, 255), anchor="mm")
    return im.convert("RGB")


def _wrap(q, maxc=16):
    words, lines, cur = q.split(), [], ""
    for w in words:
        if len((cur + " " + w).strip()) <= maxc or not cur:
            cur = (cur + " " + w).strip()
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return "\n".join(lines)


def make_clip(bg, carte, n_frames, mode, out_mp4):
    W, H = mode["out"]
    bg = bg.resize((W, H))
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(config.FPS),
           "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", str(max(14, mode["crf"] - 4)), "-pix_fmt", "yuv420p",
           str(out_mp4)]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(n_frames):
        p.stdin.write(frame(bg, carte, f / config.FPS, W, H).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError("ffmpeg a échoué (carte-question)")
