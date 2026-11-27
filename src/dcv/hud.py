"""Pastille fixe en haut de l'écran : « INVITÉS : 12 » (réutilisable : n'importe quel
label). Le chiffre compte de « de » à « a » pendant le plan, avec plusieurs courbes :
  lineaire  : progression régulière
  saut      : reste bas puis bondit d'un coup (gag)
  emballe   : accélère de plus en plus (s'emballe)
  fixe      : ne bouge pas
Styles : normal (marine), flash (rouge, flash-forward), deborde (rouge, chiffres trop
gros pour la pastille), doux (vert tendre, fin feel-good).
Effet « explose » : la pastille tremble, les chiffres grossissent et débordent, des
éclats jaillissent. Zones sûres : centre à 13,5 % de la hauteur, décalée à gauche.
"""
import math
import random

from PIL import Image, ImageDraw

from . import config
from .textures import font

STYLES = {
    "normal": dict(bg=(24, 30, 52, 238), bord=(120, 220, 255, 255), fg=(255, 255, 255, 255)),
    "flash": dict(bg=(205, 22, 38, 245), bord=(255, 200, 200, 255), fg=(255, 255, 255, 255)),
    "deborde": dict(bg=(205, 22, 38, 245), bord=(255, 230, 120, 255), fg=(255, 255, 255, 255)),
    "doux": dict(bg=(36, 140, 96, 240), bord=(200, 255, 220, 255), fg=(255, 255, 255, 255)),
}


def valeur(h, u):
    """Valeur affichée à la fraction u (0..1) du plan."""
    de, a = h["de"], h["a"]
    c = h.get("courbe", "lineaire")
    if c == "fixe" or de == a:
        return a
    if c == "saut":
        k = 0.0 if u < 0.55 else min(1.0, (u - 0.55) / 0.12)
    elif c == "emballe":
        k = (math.exp(3.2 * min(1, u / 0.9)) - 1) / (math.exp(3.2) - 1)
    else:
        k = min(1.0, u / 0.85)
    return de + (a - de) * k


def fmt(v, format="nombre", signe=""):
    n = int(round(v))
    if format == "temps":                      # compte à rebours mm:ss
        n = max(0, n)
        return f"{signe}{n // 60}:{n % 60:02d}"
    return signe + f"{n:,}".replace(",", " ")  # espace fine des milliers : 1 000


def _bed_icon(d, x, y, s, col):
    """Petite icône de lit (cadre + oreiller)."""
    d.rounded_rectangle([x, y + s * 0.45, x + s * 1.3, y + s * 0.8], radius=s * 0.08, fill=col)
    d.rectangle([x, y + s * 0.1, x + s * 0.12, y + s], fill=col)
    d.rectangle([x + s * 1.18, y + s * 0.45, x + s * 1.3, y + s], fill=col)
    d.rounded_rectangle([x + s * 0.18, y + s * 0.22, x + s * 0.55, y + s * 0.45], radius=s * 0.08, fill=col)


def _clock_icon(d, x, y, s, col):
    """Petite horloge (compte à rebours)."""
    cx, cy, r = x + s * 0.6, y + s * 0.55, s * 0.45
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col, width=max(2, int(s * 0.12)))
    d.line([cx, cy, cx, cy - r * 0.65], fill=col, width=max(2, int(s * 0.1)))
    d.line([cx, cy, cx + r * 0.5, cy + r * 0.2], fill=col, width=max(2, int(s * 0.1)))


def draw(img, h, t, duree, prev_value=None):
    """Dessine la pastille sur img (RGBA, taille de sortie) à l'instant t du plan."""
    if not h:
        return img
    W, H = img.size
    k = W / 1080
    u = min(1.0, t / max(0.1, duree))
    t_expl = 0.0
    if h.get("retard"):
        # le compte à rebours atteint 0:00 aux 3/4 du plan, puis bascule en « RETARD : +0:xx »
        U0 = 0.72
        if u < U0:
            h = dict(h, courbe="lineaire")
            v = h["de"] + (h["a"] - h["de"]) * min(1.0, u / U0)
        else:
            t_expl = U0 * duree
            v = h["retard"] * min(1.0, (u - U0) / (1 - U0) * 1.15)
            h = dict(h, label="RETARD", signe="+", style="deborde", effet=h.get("effet"))
    else:
        v = valeur(h, u)
    st = STYLES.get(h.get("style", "normal"), STYLES["normal"])
    explode = h.get("effet") == "explose" and t >= t_expl
    if explode:
        t = t - t_expl          # l'explosion part du moment de la bascule
    # « pop » à chaque changement de valeur
    v_prev = v if h.get("retard") else valeur(h, max(0.0, (t - 0.12) / max(0.1, duree)))
    pop = 1.0 + (0.12 if int(round(v)) != int(round(v_prev)) else 0.0)
    zoom = 1.0
    cx, cy = 0.44 * W, 0.135 * H
    for (z0, z1) in h.get("zoom", []):                 # cadrage « compteur_haut » : la pastille grossit
        if z0 <= t < z1:
            a = min(1.0, (t - z0) / 0.18)
            zoom = 1.0 + 0.9 * (1 - (1 - a) ** 3)
            cy = 0.135 * H + (0.30 - 0.135) * H * a
    shake = (0, 0)
    num_scale = 1.0
    if explode:
        e = min(1.0, t / 0.35)
        num_scale = 1.0 + 1.1 * (1 - (1 - e) ** 2)
        amp = 18 * k * max(0.2, 1 - t / 1.5)
        rng = random.Random(int(t * 60))
        shake = (rng.uniform(-amp, amp), rng.uniform(-amp, amp))
    if h.get("style") == "deborde":
        num_scale = max(num_scale, 1.55)
        rng = random.Random(int(t * 30))
        shake = (shake[0] + rng.uniform(-4, 4) * k, shake[1] + rng.uniform(-3, 3) * k)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    fs = int(76 * k * zoom)
    f_label = font(fs, True)
    f_num = font(int(fs * pop * num_scale), True)
    label = f"{h['label']} :"
    num = fmt(v, h.get("format", "nombre"), h.get("signe", ""))
    lw = d.textlength(label, font=f_label)
    nw = d.textlength(num, font=font(int(fs * pop), True))      # largeur « normale » : la pastille ne grandit pas
    icon = fs * 0.9
    pad = 34 * k * zoom
    pw = pad + icon * 1.3 + 18 * k * zoom + lw + 16 * k * zoom + nw + pad
    maxw = (config.SAFE_RIGHT - config.SAFE_LEFT) * W
    if pw > maxw:                       # trop large (zoom, gros nombre) : on réduit tout
        r = maxw / pw
        fs = int(fs * r); zoom *= r
        f_label = font(fs, True); f_num = font(int(fs * pop * num_scale), True)
        lw = d.textlength(label, font=f_label); nw = d.textlength(num, font=font(int(fs * pop), True))
        icon = fs * 0.9; pad = 34 * k * zoom
        pw = pad + icon * 1.3 + 18 * k * zoom + lw + 16 * k * zoom + nw + pad
    ph = fs * 1.55
    x0 = cx - pw / 2 + shake[0]
    y0 = cy - ph / 2 + shake[1]
    x0 = max(config.SAFE_LEFT * W, min(x0, config.SAFE_RIGHT * W - pw))
    d.rounded_rectangle([x0, y0, x0 + pw, y0 + ph], radius=ph / 2, fill=st["bg"], outline=st["bord"],
                        width=max(3, int(7 * k * zoom)))
    if h.get("format") == "temps":
        _clock_icon(d, x0 + pad, y0 + (ph - icon) / 2, icon, st["fg"])
    else:
        _bed_icon(d, x0 + pad, y0 + (ph - icon) / 2, icon, st["fg"])
    tx = x0 + pad + icon * 1.3 + 18 * k * zoom
    d.text((tx, y0 + ph / 2), label, font=f_label, fill=st["fg"], anchor="lm")
    nx = tx + lw + 16 * k * zoom
    col = (255, 225, 0, 255) if (pop > 1 or explode) else st["fg"]
    d.text((nx, y0 + ph / 2), num, font=f_num, fill=col, anchor="lm",
           stroke_width=int(6 * k * num_scale) if num_scale > 1 else 0, stroke_fill=(20, 10, 10, 255))
    if explode and t < 1.2:
        # éclats qui jaillissent de la pastille
        rng = random.Random(7)
        for i in range(26):
            ang = rng.uniform(0, 2 * math.pi)
            spd = rng.uniform(250, 700) * k
            r = spd * t
            px = nx + nw / 2 + math.cos(ang) * r
            py = y0 + ph / 2 + math.sin(ang) * r + 400 * k * t * t
            s = rng.uniform(10, 22) * k * (1 - t / 1.2)
            c = rng.choice([(255, 225, 0), (255, 90, 60), (255, 255, 255), (120, 220, 255)])
            d.rectangle([px - s, py - s, px + s, py + s], fill=(*c, int(255 * (1 - t / 1.2))))
    out = img.convert("RGBA")
    out.alpha_composite(layer)
    return out
