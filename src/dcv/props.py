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
            "panneau": T.panneau_image, "carton": T.carton_image}[kind]
    im = make(texte)
    p = Path(ctx["tex_dir"]) / f"{name}.png"
    im.save(p)
    h = w * im.size[1] / im.size[0]
    m = S.image_material(p, emit=emit, alpha=False, name=f"TXT_{name}")
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
