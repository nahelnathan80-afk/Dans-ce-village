"""Décor « parc » (la nuit, il fait peur) : pelouse, allée, balançoire (qui peut
bouger toute seule : "accessoires": {"balancoire_qui_bouge": true}), toboggan avec
un doudou posé dessus ("doudou": "toboggan"), bancs, arbres, lampadaire, grille.
Ancres : parc, balancoire, toboggan, devant_toboggan, doudou, banc.
"""
import math

from .. import props as P
from .. import scene as S
from . import World


def build(ctx):
    w = World("parc")
    acc = ctx.get("accessoires") or {}
    S.box("pelouse", (60, 40, 0.1), (0, 8, -0.1), "#4f772d", origin="bottom", bevel=0)
    S.box("allee", (2.0, 30, 0.012), (-2.6, 8, 0), "#b7a58a", origin="bottom", bevel=0)
    S.box("sable", (6.5, 4.5, 0.03), (1.2, 5.0, 0), "#d9c59a", origin="bottom", bevel=0)
    # balançoire : portique + siège suspendu (pivot animé)
    BX, BY = -0.6, 5.6
    metal = S.material("#c1121f", 0.4, metal=0.3)
    for sx in (-1, 1):
        for sy in (-1, 1):
            S.box("portique_pied", (0.1, 0.1, 2.5), (BX + sx * 1.0, BY + sy * 0.5, 0), mat=metal, origin="bottom", bevel=0.01,
                  rot=(sy * 0.2, 0, 0))
    S.box("portique_barre", (2.2, 0.1, 0.1), (BX, BY, 2.35), mat=metal, origin="bottom", bevel=0.01)
    piv = S.empty("balancoire_pivot", (BX, BY, 2.35))
    for sx in (-0.25, 0.25):
        S.box("corde", (0.03, 0.03, 1.85), (sx, 0, -1.85), "#d4d4d4", parent=piv, origin="bottom", bevel=0)
    S.box("siege", (0.6, 0.3, 0.06), (0, 0, -1.9), "#3a3a3a", parent=piv, origin="bottom", bevel=0.01)
    if acc.get("balancoire_qui_bouge"):
        def _swing(t, piv=piv):
            piv.rotation_euler = (0.42 * math.sin(t * 2.1), 0, 0)     # elle se balance… toute seule
        w.animations.append(_swing)
    w.add_anchor("balancoire", BX, BY, 0.9, 0.0, 1.4)
    # toboggan : échelle + plateforme + pente
    TX, TY = 3.0, 4.6
    S.box("tob_plateforme", (0.8, 0.8, 0.1), (TX, TY + 0.6, 1.5), "#ffb703", origin="bottom", bevel=0.02)
    for sx in (-0.35, 0.35):
        S.box("tob_montant", (0.08, 0.08, 1.6), (TX + sx, TY + 1.0, 0), "#023047", origin="bottom", bevel=0)
        S.box("tob_bord", (0.06, 1.9, 0.18), (TX + sx, TY - 0.3, 0.75), "#fb8500", origin="bottom", bevel=0.01, rot=(-0.72, 0, 0))
    for k in range(5):
        S.box("tob_barreau", (0.7, 0.05, 0.05), (TX, TY + 1.0, 0.3 + k * 0.3), "#023047", origin="bottom", bevel=0)
    S.box("tob_pente", (0.66, 1.9, 0.06), (TX, TY - 0.3, 0.75), "#fb8500", origin="bottom", bevel=0.01, rot=(-0.72, 0, 0))
    w.add_anchor("toboggan", TX, TY - 0.3, 0.9, 0.0, 1.4)
    w.add_anchor("devant_toboggan", TX - 1.3, TY - 1.8, 0.0, 0.0, 0.5)
    if acc.get("doudou") == "toboggan":
        # le doudou posé au milieu de la pente
        DX, DY, DZ = TX, TY - 0.25, 0.95
        S.box("doudou_corps", (0.2, 0.16, 0.22), (DX, DY, DZ), "#c68b59", origin="bottom", bevel=0.05, rot=(-0.72, 0, 0))
        S.box("doudou_tete", (0.18, 0.16, 0.16), (DX, DY - 0.12, DZ + 0.2), "#c68b59", origin="bottom", bevel=0.05, rot=(-0.72, 0, 0))
        for sx in (-0.07, 0.07):
            S.box("doudou_oreille", (0.06, 0.05, 0.06), (DX + sx, DY - 0.16, DZ + 0.34), "#8d5a3b", origin="bottom", bevel=0.02)
        S.box("doudou_noeud", (0.12, 0.03, 0.05), (DX, DY - 0.16, DZ + 0.12), "#e63946", origin="bottom", bevel=0.01)
        w.add_anchor("doudou", DX, DY - 0.1, DZ + 0.18, "haut", 0.5)
    # bancs, arbres sombres, lampadaire, grille du parc
    for bx in (-5.0, 6.5):
        S.box("banc", (1.6, 0.5, 0.08), (bx, 2.6, 0.38), "#6b4226", origin="bottom", bevel=0.015)
        S.box("banc_dos", (1.6, 0.08, 0.45), (bx, 2.85, 0.5), "#6b4226", origin="bottom", bevel=0.015)
    w.add_anchor("banc", -5.0, 2.6, 0.6, 0.0, 1.6)
    for (tx, ty, s) in ((-6.5, 8.5, 1.4), (-3.5, 11, 1.6), (6.0, 9.5, 1.5), (9.0, 6.0, 1.3), (-9.0, 5.0, 1.2)):
        P.tree(f"arbre{tx}", tx, ty, s, leaf="#2d6a4f")
    P.street_lamp("lamp_parc", -2.0, 2.0, lit=ctx.get("lampes", 0.0) or 6.0, color="#cfe8ff", light=180.0)
    for k in range(-30, 31):
        S.box("grille", (0.05, 0.05, 1.2), (k * 0.3, 12.5, 0), "#1b1b1b", origin="bottom", bevel=0)
    w.add_anchor("parc", 0.5, 5.0, 1.0, 0.0, 6)
    w.zones = {"trottoirs": (-6, 6, 1.0, 3.0), "allee": (-3.4, -1.8, 1.0, 10)}
    w.overview = ((0.6, -0.8, 1.7), (0.8, 5.0, 1.0), 24)
    return w
