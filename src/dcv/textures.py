"""Textures dessinées avec PIL : compteurs, affiches, journaux, tableau,
panneaux, photo souvenir, étiquettes de cartons.
Toutes les polices sont libres (Montserrat, OFL).
Les animations de texture (glitch, photo qui s'efface, visages) sont écrites
en « séquences d'images » : un PNG par image du plan (les doublons sont des
liens physiques, donc presque gratuits).
"""
import os
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

from . import config
from .faces import draw_face, _hex


def font(size, black=False):
    try:
        return ImageFont.truetype(config.FONT_BLACK if black else config.FONT_BOLD, size)
    except OSError:
        return ImageFont.load_default(size)


def fit_text(d, text, maxw, maxh, start, black=True, spacing=0.12):
    """Plus grande taille de police pour que le texte (multi-lignes) tienne."""
    size = start
    while size > 10:
        f = font(size, black)
        bb = d.multiline_textbbox((0, 0), text, font=f, spacing=int(size * spacing), align="center")
        if bb[2] - bb[0] <= maxw and bb[3] - bb[1] <= maxh:
            return f, bb
        size = int(size * 0.92)
    f = font(size, black)
    return f, d.multiline_textbbox((0, 0), text, font=f, align="center")


def draw_center(d, box, text, fill, start=200, black=True, stroke=0, stroke_fill=None):
    x0, y0, x1, y1 = box
    f, bb = fit_text(d, text, x1 - x0, y1 - y0, start, black)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    sp = int(f.size * 0.12)
    d.multiline_text(((x0 + x1 - w) / 2 - bb[0], (y0 + y1 - h) / 2 - bb[1]), text, font=f, fill=fill,
                     align="center", spacing=sp, stroke_width=stroke, stroke_fill=stroke_fill)


# --------------------------------------------------------------------------
# Compteurs au-dessus des têtes
# --------------------------------------------------------------------------
STYLES_COMPTEUR = {
    "normal": dict(bg=(24, 30, 52, 235), fg=(255, 255, 255, 255), bord=(120, 220, 255, 255)),
    "rouge_glitch": dict(bg=(205, 22, 38, 245), fg=(255, 255, 255, 255), bord=(255, 200, 200, 255)),
    "rouge": dict(bg=(205, 22, 38, 245), fg=(255, 255, 255, 255), bord=(255, 200, 200, 255)),
    "orange": dict(bg=(255, 136, 0, 245), fg=(35, 20, 10, 255), bord=(255, 235, 170, 255)),
}
CW, CH = 1024, 300


def counter_image(texte, style="normal"):
    """Pastille du compteur ; s'élargit pour les textes longs (AUJOURD'HUI…)."""
    st = STYLES_COMPTEUR.get(style, STYLES_COMPTEUR["normal"])
    tw = ImageDraw.Draw(Image.new("RGBA", (8, 8))).textlength(texte, font=font(170, True))
    cw = int(max(CW, tw + 330))
    im = Image.new("RGBA", (cw, CH), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([8, 8, cw - 8, CH - 8], radius=CH // 2 - 8, fill=st["bg"], outline=st["bord"], width=14)
    # petit sablier à gauche
    cx, cy = 150, CH // 2
    d.polygon([(cx - 45, cy - 70), (cx + 45, cy - 70), (cx, cy)], fill=st["fg"])
    d.polygon([(cx - 45, cy + 70), (cx + 45, cy + 70), (cx, cy)], fill=st["fg"])
    draw_center(d, (230, 40, cw - 70, CH - 40), texte, st["fg"], start=170)
    return im


def glitch(im, rng, force=1.0):
    """Décalage RVB + tranches décalées + bruit."""
    r, g, b, a = im.split()
    off = int(18 * force)
    r = ImageChops.offset(r, rng.randint(-off, off), 0)
    b = ImageChops.offset(b, rng.randint(-off, off), rng.randint(-3, 3))
    out = Image.merge("RGBA", (r, g, b, ImageChops.lighter(a, ImageChops.offset(a, off // 2, 0))))
    w, h = out.size
    for _ in range(int(4 * force) + 1):
        y0 = rng.randint(0, h - 20)
        hh = rng.randint(8, 50)
        sl = out.crop((0, y0, w, y0 + hh))
        out.paste(sl, (rng.randint(-60, 60), y0))
    return out


# --------------------------------------------------------------------------
# Textes du décor
# --------------------------------------------------------------------------
def affiche_image(texte):
    """Affiche d'avertissement : papier jaune, bandeau rouge, texte noir."""
    w, h = 800, 1100
    im = Image.new("RGBA", (w, h), (255, 222, 60, 255))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w, h], outline=(200, 30, 30, 255), width=34)
    d.rectangle([34, 34, w - 34, 230], fill=(200, 30, 30, 255))
    # triangle « attention »
    d.polygon([(w / 2, 60), (w / 2 - 95, 210), (w / 2 + 95, 210)], fill=(255, 222, 60, 255))
    draw_center(d, (w / 2 - 30, 100, w / 2 + 30, 200), "!", (200, 30, 30, 255), start=110)
    draw_center(d, (70, 280, w - 70, h - 90), texte, (20, 20, 20, 255), start=180)
    return im


def journal_image(texte, journal="LE COURRIER DE LA VILLE"):
    """Une de journal : titre énorme, colonnes de faux texte, photo floue."""
    w, h = 1000, 1300
    im = Image.new("RGBA", (w, h), (238, 233, 220, 255))
    d = ImageDraw.Draw(im)
    draw_center(d, (40, 25, w - 40, 120), journal, (30, 30, 30, 255), start=80)
    d.line([40, 135, w - 40, 135], fill=(30, 30, 30, 255), width=8)
    d.rectangle([40, 160, w - 40, 560], fill=(170, 20, 30, 255))
    draw_center(d, (60, 175, w - 60, 545), texte, (255, 255, 255, 255), start=200)
    # photo (rue, barrière) + colonnes de texte
    d.rectangle([40, 600, 520, 960], fill=(120, 125, 135, 255))
    d.rectangle([80, 820, 480, 860], fill=(240, 240, 240, 255))
    for k in range(5):
        d.rectangle([80 + k * 80, 820, 120 + k * 80, 860], fill=(220, 40, 40, 255))
    rng = random.Random(4)
    for col, x0 in enumerate((560, 40)):
        y = 600 if col == 0 else 1000
        x1 = w - 40 if col == 0 else w - 40
        while y < h - 50:
            d.rectangle([x0, y, x0 + rng.randint(int((x1 - x0) * 0.6), x1 - x0), y + 14], fill=(90, 90, 90, 255))
            y += 32
    return im


def tableau_image(texte):
    w, h = 1600, 800
    im = Image.new("RGBA", (w, h), (35, 85, 60, 255))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w, h], outline=(150, 105, 60, 255), width=40)
    draw_center(d, (120, 120, w - 120, h - 160), texte, (245, 245, 235, 255), start=180)
    d.line([200, h - 140, w - 200, h - 140], fill=(230, 230, 230, 180), width=8)
    return im.filter(ImageFilter.GaussianBlur(1.2))


def panneau_image(texte, bg=(30, 80, 170, 255), fg=(255, 255, 255, 255)):
    w, h = 1400, 420
    im = Image.new("RGBA", (w, h), bg)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([14, 14, w - 14, h - 14], radius=40, outline=fg, width=14)
    draw_center(d, (60, 50, w - 60, h - 50), texte, fg, start=220)
    return im


def portail_image(texte):
    """Enseigne dorée de portail : fond doré dégradé, texte noir, liseré."""
    w, h = 1400, 560
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for y in range(h):
        k = y / h
        c = (int(255 - 40 * k), int(210 - 60 * k), int(70 - 30 * k), 255)
        d.line([0, y, w, y], fill=c)
    d.rounded_rectangle([10, 10, w - 10, h - 10], radius=60, outline=(120, 80, 10, 255), width=22)
    d.rounded_rectangle([44, 44, w - 44, h - 44], radius=40, outline=(255, 245, 190, 255), width=8)
    lines = texte.split("\n")
    if len(lines) >= 2:
        draw_center(d, (90, 70, w - 90, h * 0.58), lines[0], (40, 25, 5, 255), start=220)
        draw_center(d, (140, h * 0.6, w - 140, h - 80), "\n".join(lines[1:]), (150, 20, 30, 255), start=120)
    else:
        draw_center(d, (90, 70, w - 90, h - 70), texte, (40, 25, 5, 255), start=200)
    return im


def pancarte_image(texte):
    """Pancarte en bois peinte (règles, annonces)."""
    w, h = 1200, 700
    im = Image.new("RGBA", (w, h), (196, 140, 80, 255))
    d = ImageDraw.Draw(im)
    for k in range(0, h, 140):
        d.line([0, k, w, k], fill=(150, 100, 55, 255), width=8)
    d.rectangle([0, 0, w - 1, h - 1], outline=(110, 70, 35, 255), width=30)
    draw_center(d, (80, 80, w - 80, h - 80), texte, (255, 255, 255, 255), start=200, stroke=10, stroke_fill=(80, 40, 20, 255))
    return im


def horloge_image(texte):
    """Réveil numérique (« 3:00 ») rouge sur fond noir."""
    w, h = 800, 400
    im = Image.new("RGBA", (w, h), (20, 20, 24, 255))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([8, 8, w - 8, h - 8], radius=50, outline=(80, 80, 90, 255), width=14)
    draw_center(d, (60, 50, w - 60, h - 50), texte, (255, 50, 50, 255), start=260)
    return im


def carton_image(texte):
    w, h = 512, 512
    im = Image.new("RGBA", (w, h), (196, 150, 98, 255))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 220, w, 292], fill=(220, 190, 140, 255))   # scotch
    if texte:
        draw_center(d, (60, 330, w - 60, 470), texte, (40, 30, 30, 255), start=110)
    return im


def photo_image(perso_def, efface=0.0):
    """Photo souvenir encadrée d'un personnage (visage + haut), qui peut
    s'effacer (efface 0 → 1 : se décolore jusqu'au papier blanc)."""
    w, h = 600, 760
    c = perso_def.get("couleurs", {})
    im = Image.new("RGBA", (w, h), (250, 248, 240, 255))
    ph = Image.new("RGBA", (w - 80, h - 160), (150, 200, 245, 255))
    d = ImageDraw.Draw(ph)
    pw, phh = ph.size
    d.rectangle([0, phh * 0.72, pw, phh], fill=(120, 190, 110, 255))
    d.rectangle([pw * 0.18, phh * 0.68, pw * 0.82, phh], fill=_hex(c.get("haut", "#ffd21f")))
    d.rectangle([pw * 0.22, phh * 0.18, pw * 0.78, phh * 0.7], fill=_hex(c.get("peau", "#f2c9a0")))
    d.rectangle([pw * 0.2, phh * 0.12, pw * 0.8, phh * 0.27], fill=_hex(c.get("cheveux", "#5a3a22")))
    f = draw_face("joyeux", c).resize((int(pw * 0.56), int(pw * 0.56)))
    ph.alpha_composite(f, (int(pw * 0.22), int(phh * 0.2)))
    im.alpha_composite(ph, (40, 40))
    d2 = ImageDraw.Draw(im)
    draw_center(d2, (40, h - 110, w - 40, h - 30), perso_def.get("etiquette", "").title(), (60, 60, 60, 255), start=70)
    if efface > 0:
        paper = Image.new("RGBA", im.size, (252, 250, 244, 255))
        gray = im.convert("L").convert("RGBA")
        im = Image.blend(im, gray, min(1, efface * 1.5))
        im = Image.blend(im, paper, min(1, efface))
    return im


# --------------------------------------------------------------------------
# Séquences d'images (un PNG par image, doublons = liens physiques)
# --------------------------------------------------------------------------
class Sequence:
    def __init__(self, folder: Path, n_frames: int):
        self.folder = Path(folder)
        self.folder.mkdir(parents=True, exist_ok=True)
        self.n = n_frames
        self._known = {}

    def path(self, f):
        return self.folder / f"f_{f:04d}.png"

    def write(self, f, key, make):
        """Écrit l'image f ; make() n'est appelé que si la clé est nouvelle."""
        p = self.path(f)
        if key in self._known:
            if p.exists():
                p.unlink()
            os.link(self._known[key], p)
        else:
            make().save(p)
            self._known[key] = p
