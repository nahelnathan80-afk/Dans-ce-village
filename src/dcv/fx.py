"""Effets 2D réutilisables appliqués au montage de chaque plan :
  flash         : flash blanc d'entrée (flash-forward)
  rembobinage   : retour arrière façon cassette VHS (bandes, décalages, « ◀◀ »)
  pluie         : traits de pluie + léger assombrissement bleuté
  zzz           : lettres « Z z z » qui montent au-dessus des dormeurs
"""
import math
import random

import numpy as np
from PIL import Image, ImageDraw

from .textures import font


def flash(img, t, dur=0.28):
    if t >= dur:
        return img
    a = int(255 * (1 - t / dur) ** 1.5)
    white = Image.new("RGB", img.size, (255, 255, 255))
    return Image.blend(img.convert("RGB"), white, a / 255)


def rembobinage(img, t, dur=1.1):
    if t >= dur:
        return img
    W, H = img.size
    k = W / 1080
    rng = random.Random(int(t * 30))
    a = np.asarray(img.convert("RGB")).copy()
    force = 1 - t / dur
    # bandes décalées horizontalement
    for _ in range(int(10 * force) + 2):
        y = rng.randint(0, H - 40)
        h = rng.randint(6, int(60 * k) + 7)
        a[y:y + h] = np.roll(a[y:y + h], rng.randint(-int(80 * k), int(80 * k)), axis=1)
    # aberration chromatique + désaturation légère
    a[..., 0] = np.roll(a[..., 0], int(8 * k * force), axis=1)
    a[..., 2] = np.roll(a[..., 2], -int(8 * k * force), axis=1)
    im = Image.fromarray(a)
    d = ImageDraw.Draw(im, "RGBA")
    # bande de bruit qui défile
    yb = int((t * 2.3 % 1) * H)
    d.rectangle([0, yb, W, yb + int(24 * k)], fill=(255, 255, 255, 70))
    for y in range(0, H, int(6 * k) + 1):
        d.line([0, y, W, y], fill=(0, 0, 0, 40))
    # pictogramme « retour arrière » en haut à gauche
    x, y, s = 70 * k, 0.22 * H, 46 * k
    for i in range(2):
        xx = x + i * s * 0.9
        d.polygon([(xx + s, y), (xx + s, y + s * 1.2), (xx, y + s * 0.6)], fill=(255, 255, 255, 230))
    d.text((x + s * 2.2, y + s * 0.6), "RETOUR", font=font(int(44 * k), True), fill=(255, 255, 255, 230), anchor="lm")
    return im


def pluie(img, t, seed=0):
    W, H = img.size
    k = W / 1080
    base = Image.blend(img.convert("RGB"), Image.new("RGB", img.size, (30, 40, 80)), 0.12)
    d = ImageDraw.Draw(base, "RGBA")
    rng = random.Random(seed)
    for i in range(170):
        x0 = rng.uniform(-200, W)
        sp = rng.uniform(1800, 2600) * k
        y = (rng.uniform(0, H) + t * sp) % (H + 200) - 100
        L = rng.uniform(40, 90) * k
        x = x0 + (y / H) * 120 * k
        d.line([x, y, x + 0.25 * L, y + L], fill=(210, 225, 255, rng.randint(70, 140)), width=max(1, int(3 * k)))
    return base


def zzz(d, k, x, y, t, seed=0):
    """« Z z z » qui montent en boucle depuis (x, y) (au-dessus de la tête)."""
    for i in range(3):
        ph = (t * 0.6 + i / 3 + seed * 0.37) % 1.0
        s = int((34 + 18 * i) * k)
        px = x + 30 * k * i + 14 * k * math.sin((ph + i) * 6)
        py = y - ph * 140 * k - i * 30 * k
        a = int(255 * min(1, (1 - ph) * 1.6))
        d.text((px, py), "Z" if i == 2 else "z", font=font(s, True), fill=(255, 255, 255, a),
               stroke_width=max(2, int(5 * k)), stroke_fill=(40, 40, 90, a), anchor="mm")


_fog_cache = {}


def brouillard(img, t):
    """Brouillard qui dérive lentement, plus dense en bas et au loin (milieu d'image)."""
    W, H = img.size
    key = (W, H)
    if key not in _fog_cache:
        rng = np.random.default_rng(5)
        small = rng.random((H // 40 + 2, W // 40 + 2)).astype(np.float32)
        big = np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((W * 2, H), Image.BICUBIC),
                         dtype=np.float32) / 255.0
        yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
        band = np.clip(1.0 - np.abs(yy - 0.62) / 0.38, 0, 1) ** 1.3        # dense vers le sol, au centre
        _fog_cache[key] = (big, band)
    big, band = _fog_cache[key]
    off = int((t * 40) % W)
    noise = big[:, off:off + W]
    alpha = (0.16 + 0.34 * noise) * band
    a = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    fog = np.array([0.78, 0.82, 0.92], dtype=np.float32)
    out = a * (1 - alpha[..., None]) + fog * alpha[..., None]
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
