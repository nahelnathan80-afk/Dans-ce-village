"""Accessoires et mobilier cubiques + textes lisibles dans le décor.

Les textes (affiches, journaux, tableau, panneaux, cartons) sont dessinés
avec PIL (textures.py) puis plaqués sur des plans légèrement émissifs pour
rester lisibles quelle que soit l'ambiance.
"""
import math
from pathlib import Path

from . import scene as S
from . import textures as T

PI = math.pi


def text_panel(ctx, name, kind, texte, loc, w, rot=(PI / 2, 0, 0), emit=0.25):
    """Crée un panneau de texte. kind : affiche | journal | tableau | panneau | carton."""
    make = {"affiche": T.affiche_image, "journal": T.journal_image, "tableau": T.tableau_image,
            "panneau": T.panneau_image, "carton": T.carton_image, "portail": T.portail_image,
            "pancarte": T.pancarte_image, "horloge": T.horloge_image}[kind]
    im = make(texte)
    p = Path(ctx["tex_dir"]) / f"{name}.png"
    im.save(p)
    h = w * im.size[1] / im.size[0]
    m = S.image_material(p, emit=emit, alpha=(kind == "portail"), name=f"TXT_{name}")
    return S.plane(name, w, h, loc, m, rot=rot), h


def wall_text(ctx, slot_name, kind, texte, x, y_wall, z, w, facing="-Y", emit=0.25):
    """Panneau collé à un mur. facing : -Y (mur du fond), +X (mur gauche), -X (mur droit)."""
    if facing == "-Y":
        return text_panel(ctx, slot_name, kind, texte, (x, y_wall - 0.012, z), w, (PI / 2, 0, 0), emit)
    if facing == "+X":
        return text_panel(ctx, slot_name, kind, texte, (x + 0.012, y_wall, z), w, (PI / 2, 0, -PI / 2), emit)
    return text_panel(ctx, slot_name, kind, texte, (x - 0.012, y_wall, z), w, (PI / 2, 0, PI / 2), emit)


# --------------------------------------------------------------------------
# Mobilier
# --------------------------------------------------------------------------
def table(name, x, y, w=1.6, d=1.0, h=0.75, color="#b07a4f"):
    S.box(f"{name}_plateau", (w, d, 0.06), (x, y, h - 0.06), color, origin="bottom", bevel=0.015)
    for sx in (-1, 1):
        for sy in (-1, 1):
            S.box(f"{name}_pied", (0.07, 0.07, h - 0.06), (x + sx * (w / 2 - 0.08), y + sy * (d / 2 - 0.08), 0), color, origin="bottom", bevel=0.01)


def chair(name, x, y, yaw, color="#c98b57", h=0.45):
    """Chaise ; yaw = direction vers laquelle on est assis (0 = face à -Y)."""
    e = S.empty(name, (x, y, 0))
    e.rotation_euler = (0, 0, yaw)
    S.box(f"{name}_assise", (0.44, 0.42, 0.05), (0, 0, h - 0.05), color, parent=e, origin="bottom", bevel=0.01)
    S.box(f"{name}_dossier", (0.44, 0.05, 0.48), (0, 0.2, h), color, parent=e, origin="bottom", bevel=0.01)
    for sx in (-1, 1):
        for sy in (-1, 1):
            S.box(f"{name}_pied", (0.05, 0.05, h - 0.05), (sx * 0.18, sy * 0.17, 0), color, parent=e, origin="bottom", bevel=0.0)
    return e


def plate(name, x, y, z):
    S.cylinder(f"{name}", 0.13, 0.02, (x, y, z), "#ffffff", verts=20)
    S.cylinder(f"{name}_c", 0.08, 0.022, (x, y, z), "#e8eef5", verts=20)


def glass(name, x, y, z):
    S.cylinder(name, 0.035, 0.11, (x, y, z), "#bfe6ff", verts=10)


def tree(name, x, y, s=1.0, leaf="#5cb85c"):
    S.box(f"{name}_tronc", (0.22 * s, 0.22 * s, 1.6 * s), (x, y, 0), "#7a5232", origin="bottom", bevel=0.02)
    S.box(f"{name}_f1", (1.3 * s, 1.3 * s, 0.9 * s), (x, y, 1.5 * s), leaf, origin="bottom", bevel=0.08)
    S.box(f"{name}_f2", (0.9 * s, 0.9 * s, 0.6 * s), (x, y, 2.35 * s), leaf, origin="bottom", bevel=0.08)


def street_lamp(name, x, y, lit=0.0):
    S.box(f"{name}_mat", (0.1, 0.1, 3.4), (x, y, 0), "#2d3e50", origin="bottom", bevel=0.01)
    S.box(f"{name}_bras", (0.5, 0.1, 0.08), (x + 0.2, y, 3.3), "#2d3e50", origin="bottom", bevel=0.01)
    S.box(f"{name}_lampe", (0.3, 0.22, 0.14), (x + 0.4, y, 3.18), "#fff4c2",
          mat=S.material("#fff1b8", 0.4, emit=lit), origin="bottom", bevel=0.01)


def window(name, x, y, z, w, h, sky="#9fd3ff", facing="-Y", emit=1.0):
    """Fenêtre : cadre blanc + vitre « ciel » lumineuse."""
    vit = S.material(sky, 0.2, emit=emit)
    if facing == "-Y":
        S.box(f"{name}_cadre", (w + 0.12, 0.06, h + 0.12), (x, y - 0.02, z), "#ffffff", origin="bottom", bevel=0.01)
        S.box(f"{name}_vitre", (w, 0.07, h), (x, y - 0.03, z + 0.06), mat=vit, origin="bottom", bevel=0)
        S.box(f"{name}_croix", (0.05, 0.08, h), (x, y - 0.04, z + 0.06), "#ffffff", origin="bottom", bevel=0)
    else:
        sx = 1 if facing == "+X" else -1
        S.box(f"{name}_cadre", (0.06, w + 0.12, h + 0.12), (x + 0.02 * sx, y, z), "#ffffff", origin="bottom", bevel=0.01)
        S.box(f"{name}_vitre", (0.07, w, h), (x + 0.03 * sx, y, z + 0.06), mat=vit, origin="bottom", bevel=0)
        S.box(f"{name}_croix", (0.08, 0.05, h), (x + 0.04 * sx, y, z + 0.06), "#ffffff", origin="bottom", bevel=0)


def flowers(name, x, y, colors=("#ff4d6d", "#ffd23f", "#ffffff", "#c77dff")):
    for k, c in enumerate(colors):
        dx = (k - len(colors) / 2) * 0.09
        S.box(f"{name}_tige{k}", (0.02, 0.02, 0.32), (x + dx, y, 0), "#3a8a3a", origin="bottom", bevel=0)
        S.box(f"{name}_fleur{k}", (0.09, 0.09, 0.09), (x + dx, y, 0.3), c, origin="bottom", bevel=0.02)


def candle(name, x, y, z=0.0, h=0.16):
    S.cylinder(f"{name}", 0.035, h, (x, y, z), "#fff7e6", verts=10)
    S.box(f"{name}_flamme", (0.03, 0.03, 0.06), (x, y, z + h + 0.01), mat=S.material("#ffb347", 0.3, emit=12.0), origin="bottom", bevel=0.01)


def room(name, w=7.0, d=5.0, h=3.0, wall="#f3e3c3", floor="#c48b5a", side_wall=None, back_y=None):
    """Pièce ouverte côté caméra : sol + mur du fond + murs latéraux."""
    back_y = d if back_y is None else back_y
    S.box(f"{name}_sol", (w + 0.4, d + 8, 0.1), (0, d / 2 - 4, -0.1), floor, origin="bottom", bevel=0)
    S.box(f"{name}_plinthe", (w, 0.04, 0.1), (0, back_y - 0.02, 0), "#ffffff", origin="bottom", bevel=0)
    for sx in (-1, 1):
        S.box(f"{name}_mur_{sx}", (0.2, d + 0.2, h), (sx * (w / 2 + 0.1), d / 2, 0), side_wall or wall, origin="bottom", bevel=0)
    S.box(f"{name}_plafond", (w + 0.4, d + 0.2, 0.1), (0, d / 2, h), "#fbf6ee", origin="bottom", bevel=0)


# --------------------------------------------------------------------------
# Éléments « villa » (ép. 04) — réutilisables
# --------------------------------------------------------------------------
def palm(name, x, y, s=1.0, lean=0.15, pot=False):
    """Palmier cubique : tronc en tronçons inclinés + palmes en étoile."""
    z = 0.0
    if pot:
        S.box(f"{name}_pot", (0.7 * s, 0.7 * s, 0.6 * s), (x, y, 0), "#d9822b", origin="bottom", bevel=0.04)
        z = 0.6 * s
    px = x
    for k in range(6):
        S.box(f"{name}_tronc{k}", (0.26 * s, 0.26 * s, 0.5 * s), (px, y, z), "#a87545" if k % 2 else "#8c5f36",
              origin="bottom", bevel=0.02, rot=(0, lean, 0))
        px += 0.5 * s * math.sin(lean)
        z += 0.48 * s
    for a in range(7):
        ang = a * 2 * math.pi / 7
        leaf = S.box(f"{name}_palme{a}", (1.5 * s, 0.32 * s, 0.07 * s),
                     (px + 0.65 * s * math.cos(ang), y + 0.65 * s * math.sin(ang), z - 0.15 * s), "#3fae49" if a % 2 else "#2f9640",
                     origin="bottom", bevel=0.02, rot=(0, 0.35, ang))
    return (px, y, z)


def mattress_stack(name, x, y, n, w=1.9, d=1.0):
    cols = ["#ff8fab", "#8ecae6", "#ffd166", "#b9fbc0", "#cdb4db", "#ffffff"]
    z = 0.0
    for k in range(int(n)):
        S.box(f"{name}_mat{k}", (w + 0.06 * ((k * 7) % 3), d, 0.24), (x + 0.04 * ((k * 5) % 3 - 1), y, z), cols[k % len(cols)],
              origin="bottom", bevel=0.06, rot=(0, 0, 0.04 * ((k * 3) % 3 - 1)))
        S.box(f"{name}_bande{k}", (w * 1.01, d * 1.01, 0.05), (x, y, z + 0.09), "#ffffff", origin="bottom", bevel=0.0)
        z += 0.24
    return z


def window_heads(name, x, y_face, z, w, rng, skin=("#f6d1b0", "#c68a5e", "#8d5a3b", "#e8b48f"),
                 hair=("#2b1b12", "#a0522d", "#e0c070", "#1a1a1a")):
    """Têtes cubiques serrées dans une fenêtre, qui dépassent vers l'avant (-Y)."""
    n = max(2, int(w / 0.4))
    for i in range(n):
        hx = x - w / 2 + (i + 0.5) * w / n + rng.uniform(-0.05, 0.05)
        hz = z + rng.uniform(-0.05, 0.15)
        S.box(f"{name}_tete{i}", (0.34, 0.34, 0.34), (hx, y_face - 0.12, hz), rng.choice(skin), origin="bottom", bevel=0.03)
        S.box(f"{name}_chev{i}", (0.36, 0.36, 0.08), (hx, y_face - 0.12, hz + 0.32), rng.choice(hair), origin="bottom", bevel=0.02)
        S.box(f"{name}_yeux{i}", (0.2, 0.01, 0.06), (hx, y_face - 0.295, hz + 0.18), "#1b1b1b", origin="bottom", bevel=0)
        if rng.random() < 0.4:       # un bras qui dépasse
            S.box(f"{name}_bras{i}", (0.1, 0.5, 0.1), (hx + 0.2, y_face - 0.35, hz + 0.05), rng.choice(skin), origin="bottom",
                  bevel=0.02, rot=(0.6, 0, 0))


def garland(name, p0, p1, n=16, sag=0.4):
    """Guirlande lumineuse entre deux points (petits cubes émissifs colorés)."""
    cols = ["#ff4d6d", "#ffd23f", "#4cc9f0", "#80ff72", "#c77dff"]
    for i in range(n + 1):
        u = i / n
        x = p0[0] + (p1[0] - p0[0]) * u
        y = p0[1] + (p1[1] - p0[1]) * u
        z = p0[2] + (p1[2] - p0[2]) * u - sag * math.sin(math.pi * u)
        c = cols[i % len(cols)]
        S.box(f"{name}_ampoule{i}", (0.09, 0.09, 0.12), (x, y, z), mat=S.material(c, 0.3, emit=8.0), origin="bottom", bevel=0.02)


def old_sofa(name, x, y, made=False, yaw=0.0):
    """Vieux canapé (vert délavé, coussin rapiécé) ; made=True : couverture + oreiller."""
    e = S.empty(name, (x, y, 0))
    e.rotation_euler = (0, 0, yaw)
    base = "#7d8f5a"
    S.box(f"{name}_assise", (2.0, 0.85, 0.42), (0, 0, 0.0), base, parent=e, origin="bottom", bevel=0.06)
    S.box(f"{name}_dos", (2.0, 0.25, 0.55), (0, 0.32, 0.42), "#6c7d4c", parent=e, origin="bottom", bevel=0.06)
    for sx in (-1.0, 1.0):
        S.box(f"{name}_acc", (0.22, 0.85, 0.6), (sx, 0, 0.0), "#6c7d4c", parent=e, origin="bottom", bevel=0.06)
    S.box(f"{name}_coussin1", (0.85, 0.7, 0.14), (-0.45, -0.05, 0.42), "#8fa36a", parent=e, origin="bottom", bevel=0.05)
    S.box(f"{name}_coussin2", (0.85, 0.7, 0.14), (0.45, -0.05, 0.42), "#8fa36a", parent=e, origin="bottom", bevel=0.05)
    S.box(f"{name}_rustine", (0.22, 0.02, 0.18), (0.55, -0.41, 0.15), "#d4a373", parent=e, origin="bottom", bevel=0.0)
    if made:
        S.box(f"{name}_couverture", (1.65, 0.78, 0.07), (0.1, -0.05, 0.56), "#f28482", parent=e, origin="bottom", bevel=0.04)
        S.box(f"{name}_carreaux", (1.66, 0.79, 0.02), (0.1, -0.05, 0.6), "#f7ede2", parent=e, origin="bottom", bevel=0.0)
        S.box(f"{name}_oreiller", (0.5, 0.5, 0.16), (-0.75, -0.05, 0.56), "#ffffff", parent=e, origin="bottom", bevel=0.07)
    return e
