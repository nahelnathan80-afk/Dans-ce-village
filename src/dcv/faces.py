"""Visages 2D expressifs dessinés avec PIL (texture plaquée sur la face avant
de la tête cubique). Grands yeux brillants, joues roses, sourcils, bouche
selon l'expression, larmes bleues en goutte, bouche en vague (peur).

draw_face(expression, couleurs, etat) → image RGBA 512×512 (fond transparent).
etat : {"blink": bool, "bouche": 0..1 (ouverture quand il parle),
        "regard": (dx, dy) en -1..1, "t": secondes (anim. larmes)}
"""
import math
from PIL import Image, ImageDraw

S = 1024          # on dessine en 1024 puis on réduit (anticrénelage)
OUT = 512


def _hex(c, a=255):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def _wave(d, x0, x1, y, amp, n, width, col):
    pts = []
    for k in range(41):
        x = x0 + (x1 - x0) * k / 40
        pts.append((x, y + amp * math.sin(k / 40 * n * 2 * math.pi)))
    d.line(pts, fill=col, width=width, joint="curve")


def _drop(d, x, y, r, col):
    """Larme en goutte (pointe en haut)."""
    d.ellipse([x - r, y - r, x + r, y + r], fill=col)
    d.polygon([(x - r * 0.92, y - r * 0.35), (x + r * 0.92, y - r * 0.35), (x, y - r * 2.4)], fill=col)
    d.ellipse([x - r * 0.45, y - r * 0.5, x - r * 0.05, y - r * 0.05], fill=(255, 255, 255, 200))


def draw_face(expression: str, couleurs: dict, etat: dict | None = None, extras: dict | None = None) -> Image.Image:
    """extras : {"lunettes": True, "moustache": "#dddddd", "taches": True}"""
    etat = etat or {}
    extras = extras or {}
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ink = (40, 28, 30, 255)
    iris = _hex(couleurs.get("yeux", "#3a2516"))
    joue = _hex(couleurs.get("joues", "#ff8fa3"), 150)
    larme = (70, 160, 255, 235)
    e = expression
    blink = etat.get("blink", False)
    dx, dy = etat.get("regard", (0, 0))
    t = etat.get("t", 0.0)

    ex = [318, 706]          # centres des yeux
    ey = 470
    rw, rh = 128, 152        # grands yeux
    if e in ("choque", "peur"):
        rw, rh = 138, 166
    if e == "pensif":
        rh = 100

    # --- joues roses (sous les yeux) ---
    for x in ex:
        if e != "souriant_fige":
            d.ellipse([x - 95, ey + 120, x + 95, ey + 190], fill=joue)

    # --- yeux ---
    for side, x in enumerate(ex):
        if blink or e == "dort":
            # yeux fermés (dort : arcs vers le bas, paisibles)
            if e == "dort":
                d.arc([x - rw * 0.8, ey - 60, x + rw * 0.8, ey + 40], 20, 160, fill=ink, width=22)
            else:
                d.arc([x - rw, ey - 40, x + rw, ey + 70], 200, 340, fill=ink, width=22)
            continue
        if e == "joyeux" and not etat.get("bouche"):
            # yeux rieurs en arc
            d.arc([x - rw, ey - 70, x + rw, ey + 90], 200, 340, fill=ink, width=26)
            continue
        d.ellipse([x - rw, ey - rh, x + rw, ey + rh], fill=(255, 255, 255, 255), outline=ink, width=14)
        pr = 72 if e not in ("choque", "peur", "vide", "souriant_fige") else 40
        if e == "souriant_fige":
            pr = 26                       # pupilles minuscules, regard fixe
        px, py = x + dx * 38, ey + 10 + dy * 30
        d.ellipse([px - pr, py - pr * 1.18, px + pr, py + pr * 1.18], fill=iris)
        d.ellipse([px - pr * 0.55, py - pr * 0.6, px + pr * 0.55, py + pr * 0.6], fill=(15, 10, 12, 255))
        if e not in ("vide", "souriant_fige"):   # reflets brillants
            d.ellipse([px - pr * 0.75, py - pr * 0.95, px - pr * 0.05, py - pr * 0.25], fill=(255, 255, 255, 255))
            d.ellipse([px + pr * 0.25, py + pr * 0.25, px + pr * 0.6, py + pr * 0.6], fill=(255, 255, 255, 230))
        if e in ("pensif", "fatigue"):  # paupière mi-close
            d.rectangle([x - rw - 8, ey - rh - 8, x + rw + 8, ey - rh * 0.25], fill=_hex(couleurs.get("peau", "#f2c9a0")))
            d.line([x - rw, ey - rh * 0.25, x + rw, ey - rh * 0.25], fill=ink, width=16)

    # --- sourcils ---
    by = ey - rh - 55
    for side, x in enumerate(ex):
        s = -1 if side == 0 else 1
        if e in ("triste", "pleure", "peur"):      # relevés vers le centre
            d.line([x + 80 * s, by + 15, x - 70 * s, by - 30], fill=ink, width=24)   # intérieur relevé
        elif e == "interrogatif":
            yy = by - (35 if side == 1 else 0)
            d.arc([x - 80, yy - 20, x + 80, yy + 50], 200, 340, fill=ink, width=22)
        elif e == "choque":
            d.arc([x - 80, by - 50, x + 80, by + 30], 200, 340, fill=ink, width=22)
        elif e in ("vide", "souriant_fige"):
            d.line([x - 70, by + 10, x + 70, by + 10], fill=ink, width=18)
        else:
            d.arc([x - 80, by - 25, x + 80, by + 45], 205, 335, fill=ink, width=20)

    # --- bouche ---
    mx, my = 512, 790
    ouvert = etat.get("bouche", 0)
    if ouvert > 0.15 and e not in ("peur", "choque"):
        h = 30 + 70 * ouvert
        d.rounded_rectangle([mx - 70, my - h / 2, mx + 70, my + h / 2], radius=40, fill=(120, 30, 45, 255), outline=ink, width=14)
        d.ellipse([mx - 40, my + h / 2 - 34, mx + 40, my + h / 2 - 4], fill=(240, 110, 120, 255))
    elif e == "joyeux":
        d.chord([mx - 120, my - 90, mx + 120, my + 80], 10, 170, fill=(120, 30, 45, 255), outline=ink, width=14)
        d.chord([mx - 60, my + 10, mx + 60, my + 75], 0, 180, fill=(240, 110, 120, 255))
    elif e in ("triste", "pleure"):
        d.arc([mx - 100, my - 10, mx + 100, my + 120], 205, 335, fill=ink, width=20)
    elif e == "peur":
        _wave(d, mx - 130, mx + 130, my, 22, 3, 20, ink)            # bouche en vague
    elif e == "choque":
        d.ellipse([mx - 55, my - 70, mx + 55, my + 70], fill=(120, 30, 45, 255), outline=ink, width=14)
        _wave(d, mx - 50, mx + 50, my + 25, 8, 2, 8, (240, 110, 120, 255))
    elif e == "interrogatif":
        d.line([mx - 70, my + 15, mx + 70, my - 10], fill=ink, width=18)
    elif e == "pensif":
        d.ellipse([mx + 10, my - 18, mx + 60, my + 22], fill=ink)
    elif e == "dort":
        d.ellipse([mx - 26, my - 20, mx + 26, my + 26], fill=(120, 30, 45, 255), outline=ink, width=10)
    elif e == "souriant_fige":
        # sourire TROP large (d'un bord à l'autre du visage), figé, deux rangées de dents
        d.chord([mx - 400, my - 330, mx + 400, my + 170], 8, 172, fill=(40, 5, 12, 255), outline=ink, width=16)
        d.rectangle([mx - 330, my - 92, mx + 330, my - 40], fill=(245, 245, 230, 255))
        d.rectangle([mx - 260, my + 40, mx + 260, my + 85], fill=(245, 245, 230, 255))
        for k in range(-7, 8):
            d.line([mx + k * 46, my - 92, mx + k * 46, my - 40], fill=(40, 5, 12, 255), width=7)
        for k in range(-5, 6):
            d.line([mx + k * 46, my + 40, mx + k * 46, my + 85], fill=(40, 5, 12, 255), width=7)
    elif e == "fatigue":     # sourit encore… mais épuisé
        d.arc([mx - 90, my - 50, mx + 90, my + 40], 25, 155, fill=ink, width=16)
    elif e == "vide":
        d.line([mx - 60, my, mx + 60, my], fill=ink, width=14)
    else:  # neutre
        d.arc([mx - 80, my - 40, mx + 80, my + 40], 20, 160, fill=ink, width=18)

    # --- larmes et gouttes ---
    if e == "pleure":
        for side, x in enumerate(ex):
            for k in range(2):
                ph = ((t * 0.7 + k * 0.5 + side * 0.25) % 1.0)
                _drop(d, x + (-1 if side == 0 else 1) * 75, ey + 120 + ph * 330, 30, (70, 160, 255, int(235 * (1 - ph * 0.6))))
    elif e == "triste":
        _drop(d, ex[0] - 70, ey + 150, 26, larme)
    elif e in ("peur", "choque"):
        _drop(d, 900, 260 + (t * 40) % 60, 34, (120, 190, 255, 220))   # goutte de sueur

    if e == "souriant_fige":  # cernes sombres, pas de joues roses
        for x in ex:
            d.ellipse([x - 150, ey - 175, x + 150, ey + 175], outline=(70, 40, 60, 160), width=26)
    if e == "fatigue":       # cernes
        for x in ex:
            d.arc([x - rw * 0.8, ey + 60, x + rw * 0.8, ey + 150], 20, 160, fill=(150, 110, 160, 200), width=12)

    # --- accessoires du visage ---
    if extras.get("taches"):            # taches de rousseur
        for x in ex:
            for k, (ox, oy) in enumerate(((-40, 150), (0, 170), (40, 150), (-15, 195), (25, 200))):
                d.ellipse([x + ox - 9, ey + oy - 9, x + ox + 9, ey + oy + 9], fill=(190, 110, 70, 200))
    if extras.get("moustache"):
        col = _hex(extras["moustache"])
        d.rounded_rectangle([mx - 150, my - 95, mx - 8, my - 40], radius=26, fill=col)
        d.rounded_rectangle([mx + 8, my - 95, mx + 150, my - 40], radius=26, fill=col)
    if extras.get("lunettes"):
        for x in ex:
            d.rounded_rectangle([x - rw - 28, ey - rh * 0.85, x + rw + 28, ey + rh * 0.95], radius=50,
                                outline=(30, 30, 40, 255), width=20)
        d.line([ex[0] + rw + 28, ey - 20, ex[1] - rw - 28, ey - 20], fill=(30, 30, 40, 255), width=20)

    if extras.get("lunettes_soleil"):   # lunettes de soleil (dorées par défaut)
        col = _hex(extras["lunettes_soleil"] if isinstance(extras["lunettes_soleil"], str) else "#e0b23a")
        for x in ex:
            d.rounded_rectangle([x - rw - 34, ey - rh * 0.75, x + rw + 34, ey + rh * 0.85], radius=60,
                                fill=(25, 22, 35, 255), outline=col, width=24)
            d.line([x - rw * 0.6, ey - rh * 0.4, x - rw * 0.1, ey - rh * 0.55], fill=(120, 120, 150, 255), width=14)
        d.line([ex[0] + rw + 34, ey - 30, ex[1] - rw - 34, ey - 30], fill=col, width=24)

    return im.resize((OUT, OUT), Image.LANCZOS)
