"""Décor « rue » : rue piétonne d'une petite ville, façades colorées,
arbres, lampadaires, banc. La caméra regarde surtout vers +Y (façades).

Emplacements de texte : mur_fond_gauche, mur_fond_centre, mur_fond_droite,
vitrine, panneau_rue.   Ancres : rue, banc, foule, mur_fond_droite…
"""
import math
import random

from .. import props as P
from .. import scene as S
from . import World, text_for

FACADES = ["#ff9e80", "#ffd166", "#8fd694", "#7cc6fe", "#c3a6ff", "#ffadc7", "#f4a259", "#9be3de"]


def _facade(name, x, y, w, h, col, rng, facing=-1, shop=None):
    """Immeuble cubique : bloc + corniche + fenêtres (+ vitrine/auvent)."""
    S.box(f"{name}", (w, 2.0, h), (x, y + facing * -1.0, 0), col, origin="bottom", bevel=0.05)
    S.box(f"{name}_corniche", (w + 0.15, 2.2, 0.25), (x, y + facing * -1.0, h), "#fff6e5", origin="bottom", bevel=0.03)
    fy = y + facing * 0.01
    cols = max(1, int(w / 1.3))
    for r in range(1, int((h - 0.5) / 1.6)):
        for c in range(cols):
            wx = x - w / 2 + (c + 0.5) * w / cols
            S.box(f"{name}_fen", (0.62, 0.08, 0.9), (wx, fy, r * 1.6 + 0.4), "#ffffff", origin="bottom", bevel=0.01)
            lit = rng.random() < 0.25
            S.box(f"{name}_vit", (0.5, 0.1, 0.78), (wx, fy + facing * 0.01, r * 1.6 + 0.46),
                  mat=S.material("#ffe9a8" if lit else "#3b5b8c", 0.2, emit=1.5 if lit else 0.0), origin="bottom", bevel=0)
    if shop:
        S.box(f"{name}_vitrine", (w * 0.7, 0.1, 1.5), (x, fy, 0.3), mat=S.material("#bfe3ff", 0.15, emit=0.3), origin="bottom", bevel=0.01)
        stripes = 6
        for k in range(stripes):
            S.box(f"{name}_auvent", (w * 0.8 / stripes, 0.9, 0.12), (x - w * 0.4 + (k + 0.5) * w * 0.8 / stripes, fy + facing * 0.45, 2.05),
                  shop if k % 2 == 0 else "#ffffff", origin="bottom", bevel=0.01, rot=(facing * -0.25, 0, 0))
    else:
        S.box(f"{name}_porte", (0.9, 0.1, 1.9), (x + w * 0.25, fy, 0), "#6b4226", origin="bottom", bevel=0.02)


def build(ctx):
    rng = random.Random(7)
    w = World("rue")
    # Sol : pavés beige chaud + bande centrale + bordures
    S.box("sol", (60, 50, 0.1), (0, 3, -0.1), "#e3cfa8", origin="bottom", bevel=0)
    S.box("bande", (60, 3.2, 0.012), (0, 5.0, 0), "#d4b88c", origin="bottom", bevel=0)
    for yb in (3.3, 6.7):
        S.box("bordure", (60, 0.18, 0.06), (0, yb, 0), "#f5ead6", origin="bottom", bevel=0.01)
    # Façades du fond (y = 10) et de devant (y = -13, pour les contrechamps)
    x = -22.0
    k = 0
    while x < 22:
        fw = rng.choice([3.2, 3.8, 4.4])
        h = rng.choice([5.5, 6.5, 7.5, 8.5])
        shop = rng.choice(["#e63946", "#2a9d8f", "#264653", None]) if abs(x) < 9 else None
        _facade(f"fac{k}", x + fw / 2, 10.0, fw, h, FACADES[k % len(FACADES)], rng, -1, shop)
        _facade(f"facB{k}", x + fw / 2, -13.0, fw, h, FACADES[(k + 3) % len(FACADES)], rng, +1)
        x += fw + 0.05
        k += 1
    # Arbres, lampadaires, banc, poubelle, plots
    for tx in (-7.5, -1.0, 6.0):
        P.tree(f"arbre{tx}", tx, 8.4, 1.0)
    for tx in (-5.5, 3.5, 9.5):
        P.tree(f"arbreA{tx}", tx, 1.2 - 3.5, 0.9)
    for lx in (-9, -3.5, 2.0, 7.5):
        P.street_lamp(f"lamp{lx}", lx, 7.7, lit=ctx.get("lampes", 0.0))
    # banc (face caméra)
    S.box("banc_assise", (1.6, 0.5, 0.08), (-2.5, 2.85, 0.38), "#a0522d", origin="bottom", bevel=0.015)
    S.box("banc_dossier", (1.6, 0.08, 0.45), (-2.5, 3.1, 0.5), "#a0522d", origin="bottom", bevel=0.015)
    for sx in (-0.7, 0.7):
        S.box("banc_pied", (0.08, 0.5, 0.38), (-2.5 + sx, 2.85, 0), "#3d3d3d", origin="bottom", bevel=0)
    w.seats += [{"x": -2.9, "y": 2.85, "h": 0.46, "yaw": 0.0, "type": "banc"},
                {"x": -2.1, "y": 2.85, "h": 0.46, "yaw": 0.0, "type": "banc"}]
    w.obstacles.append((-3.4, -1.6, 2.5, 3.2))
    S.box("poubelle", (0.4, 0.4, 0.8), (-4.0, 3.0, 0), "#2e7d32", origin="bottom", bevel=0.03)
    for px in (5.0, 5.8):
        S.box("jardiniere", (0.6, 0.6, 0.5), (px, 3.0, 0), "#9c6644", origin="bottom", bevel=0.04)
        P.flowers(f"fl{px}", px, 3.0)

    # Textes paramétrables
    slots = {"mur_fond_gauche": (-4.6, 1.8, 0.95), "mur_fond_centre": (0.4, 1.9, 0.95),
             "mur_fond_droite": (4.4, 1.7, 0.95)}
    for slot, (sx, sz, sw) in slots.items():
        t = text_for(ctx, slot)
        if t:
            P.wall_text(ctx, slot, t.get("type") or "affiche", t["texte"], sx, 10.0, sz, sw)
            w.add_anchor(slot, sx, 9.95, sz, 0.0, 1.4)
            w.obstacles.append((sx - 1.3, sx + 1.3, 5.5, 10))   # indice visible : pas de figurant devant
    t = text_for(ctx, "panneau_rue", "PLACE DU MARCHÉ")
    S.box("panneau_mat", (0.08, 0.08, 2.6), (-6.4, 7.4, 0), "#2d3e50", origin="bottom", bevel=0)
    P.text_panel(ctx, "panneau_rue", "panneau", t["texte"], (-6.4, 7.35, 2.45), 1.2)
    w.add_anchor("panneau_rue", -6.4, 7.35, 2.45, 0.0, 1.2)

    w.add_anchor("rue", 0, 5.0, 1.3, 0.0, 10)
    w.add_anchor("foule", 0, 5.0, 1.4, 0.0, 6)
    w.add_anchor("banc", -2.5, 2.85, 0.7, 0.0, 1.6)
    w.zones = {"trottoirs": (-7.5, 7.5, 1.0, 8.6), "fond": (-8, 8, 6.0, 8.6), "passage": (-7, 7, 1.0, 7.0)}
    w.overview = ((0.0, -2.6, 1.9), (0.0, 5.0, 1.45), 24)
    return w
