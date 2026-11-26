"""Décor « chambre d'ado » : lit, bureau, étagère, posters, fenêtre et un
grand MIROIR mural sur le mur du fond.

Le miroir est un « faux miroir » robuste (aucun calcul de réflexion) : c'est
une ouverture dans le mur derrière laquelle se trouve une copie symétrique de
la pièce, où render_shot place le reflet du personnage (cible « reflet:<nom> »).
Ancres : piece, lit, devant_miroir, miroir, bureau.   Textes : poster, mur.
"""
import math

from .. import props as P
from .. import scene as S
from . import World, text_for

WALL = "#a8d8ea"      # bleu clair
FLOOR = "#c8915e"
MX, MY, MW, MH, MZ = 0.9, 5.0, 0.9, 1.6, 0.35   # miroir : centre x, plan y, largeur, hauteur, bas


def _back_wall_with_hole(name, w, h, col, hole):
    """Mur du fond (y=MY) percé d'une ouverture (x0, x1, z0, z1)."""
    x0, x1, z0, z1 = hole
    d = 0.2
    S.box(f"{name}_g", (x0 + w / 2, d, h), ((-w / 2 + x0) / 2, MY + d / 2, 0), col, origin="bottom", bevel=0)
    S.box(f"{name}_d", (w / 2 - x1, d, h), ((x1 + w / 2) / 2, MY + d / 2, 0), col, origin="bottom", bevel=0)
    S.box(f"{name}_b", (x1 - x0, d, z0), ((x0 + x1) / 2, MY + d / 2, 0), col, origin="bottom", bevel=0)
    S.box(f"{name}_h", (x1 - x0, d, h - z1), ((x0 + x1) / 2, MY + d / 2, z1), col, origin="bottom", bevel=0)


def furniture(ctx, w, wall=WALL, empty=False):
    """Mobilier commun (réutilisé à vide par chambre_cartons)."""
    P.room("ch", 7.0, 5.0, 3.0, wall, FLOOR)
    P.window("fenetre", -1.6, MY, 1.1, 1.3, 1.3, sky=ctx.get("ciel_fenetre", "#9fd3ff"), emit=ctx.get("fenetre_emit", 1.2))


def build(ctx):
    w = World("chambre_ado")
    furniture(ctx, w)
    hole = (MX - MW / 2, MX + MW / 2, MZ, MZ + MH)
    _back_wall_with_hole("mur_fond", 7.0, 3.0, WALL, hole)
    # cadre du miroir
    for (sx, sz, ww, hh) in ((MX, MZ - 0.06, MW + 0.16, 0.08), (MX, MZ + MH - 0.02, MW + 0.16, 0.08),
                             (MX - MW / 2 - 0.04, MZ, 0.08, MH), (MX + MW / 2 + 0.04, MZ, 0.08, MH)):
        S.box("miroir_cadre", (ww, 0.08, hh), (sx, MY - 0.03, sz), "#ffffff", origin="bottom", bevel=0.01)
    # pièce « reflétée » derrière le miroir (symétrique, légèrement bleutée)
    S.box("reflet_sol", (2.4, 3.0, 0.1), (MX, MY + 1.6, -0.1), FLOOR, origin="bottom", bevel=0)
    S.box("reflet_fond", (2.4, 0.1, 3.0), (MX, MY + 3.1, 0), "#cfe8f3", origin="bottom", bevel=0)
    for sx in (-1, 1):
        S.box("reflet_cote", (0.1, 3.0, 3.0), (MX + sx * 1.2, MY + 1.6, 0), WALL, origin="bottom", bevel=0)
    S.box("reflet_lit", (1.0, 1.0, 0.5), (MX - 1.0, MY + 2.2, 0), "#ff7b54", origin="bottom", bevel=0.03)
    S.box("reflet_plafond", (2.4, 3.0, 0.1), (MX, MY + 1.6, 3.0), "#fbf6ee", origin="bottom", bevel=0)
    w.mirror = {"x": MX, "y": MY, "w": MW, "z0": MZ, "z1": MZ + MH}
    # lit (à gauche), couette orange, oreiller
    S.box("lit", (2.0, 1.1, 0.42), (-2.3, 3.9, 0), "#8d6e63", origin="bottom", bevel=0.03)
    S.box("couette", (1.6, 1.12, 0.14), (-2.1, 3.9, 0.42), "#ff7b54", origin="bottom", bevel=0.04)
    S.box("oreiller", (0.4, 0.8, 0.14), (-3.0, 3.9, 0.46), "#ffffff", origin="bottom", bevel=0.05)
    w.seats.append({"x": -1.9, "y": 3.25, "h": 0.5, "yaw": 0.0, "type": "lit"})
    # bureau + chaise + lampe + écran
    P.table("bureau", 2.6, 4.4, 1.4, 0.7, 0.75, "#f2f2f2")
    S.box("ecran", (0.6, 0.05, 0.38), (2.6, 4.55, 0.78), "#263238", origin="bottom", bevel=0.01)
    P.chair("chaise", 2.6, 3.8, math.pi, "#ef476f")
    # étagère + livres colorés
    S.box("etagere", (1.4, 0.3, 0.05), (-0.6, 4.85, 1.9), "#ffffff", origin="bottom", bevel=0.01)
    for k, c in enumerate(["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#8338ec", "#fb5607"]):
        S.box("livre", (0.12, 0.22, 0.3 + 0.04 * (k % 3)), (-1.15 + k * 0.17, 4.85, 1.95), c, origin="bottom", bevel=0.01)
    S.box("tapis", (2.2, 1.6, 0.02), (0.2, 2.6, 0), "#ffcad4", origin="bottom", bevel=0)
    # poster paramétrable (mur gauche)
    t = text_for(ctx, "poster", "ESPACE\nMISSION 12")
    P.wall_text(ctx, "poster", t.get("type") or "panneau", t["texte"], -3.5, 2.6, 1.5, 1.1, facing="+X")
    w.add_anchor("poster", -3.4, 2.6, 1.6, -math.pi / 2, 1.1)
    w.add_anchor("piece", 0, 3.0, 1.0, 0.0, 6)
    w.add_anchor("lit", -2.0, 3.9, 0.6, 0.0, 2)
    w.add_anchor("miroir", MX, MY, MZ + MH / 2, 0.0, 1.4)
    w.add_anchor("devant_miroir", MX, MY - 0.75, 0.0, math.pi, 0.5)
    w.add_anchor("bureau", 2.6, 4.4, 0.9, 0.0, 1.4)
    w.bounds = (-3.2, 3.2, -6.0, 4.7, 0.3, 2.85)
    w.overview = ((0.0, -3.2, 2.3), (0.0, 3.4, 1.0), 20)
    return w
