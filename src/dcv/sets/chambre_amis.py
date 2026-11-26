"""Décor « chambre d'amis » (chez Yanis) : petite pièce presque vide, vieux canapé
(*indice*), fenêtre, lampe, cadre au mur. "accessoires": {"canape_fait": true} →
couverture + oreiller sur le canapé. Ancres : piece, canape, pres_canape, porte_chambre.
"""
import math

from .. import props as P
from .. import scene as S
from . import World

BY = 4.6


def build(ctx):
    w = World("chambre_amis")
    acc = ctx.get("accessoires") or {}
    WALL = "#cfe8ef"
    P.room("ca", 6.4, BY, 2.9, WALL, "#b98b5e")
    S.box("mur_fond", (6.4, 0.2, 2.9), (0, BY + 0.1, 0), WALL, origin="bottom", bevel=0)
    P.window("fenetre", 1.9, BY, 1.0, 1.2, 1.2, sky=ctx.get("ciel_fenetre", "#9fd3ff"), emit=ctx.get("fenetre_emit", 1.2))
    P.old_sofa("canape", -0.4, BY - 0.6, made=bool(acc.get("canape_fait")))
    w.add_anchor("canape", -0.4, BY - 0.65, 0.58, 0.0, 1.4)
    S.box("lampe_pied", (0.06, 0.06, 1.5), (-2.3, BY - 0.5, 0), "#444444", origin="bottom", bevel=0)
    S.box("lampe_abat", (0.45, 0.45, 0.35), (-2.3, BY - 0.5, 1.5), mat=S.material("#ffe8a3", 0.4, emit=2.0), origin="bottom", bevel=0.04)
    S.box("cadre", (0.8, 0.04, 0.6), (-0.4, BY - 0.01, 1.75), "#8d6e63", origin="bottom", bevel=0.01)
    S.box("cadre_image", (0.66, 0.05, 0.46), (-0.4, BY - 0.02, 1.82), "#ffd6a5", origin="bottom", bevel=0)
    S.box("tapis", (2.2, 1.4, 0.02), (-0.4, 2.6, 0), "#e5989b", origin="bottom", bevel=0)
    # porte (à droite, au premier plan)
    for sx in (-0.5, 0.5):
        S.box("chambranle", (0.1, 0.15, 2.15), (2.2 + sx, 1.0, 0), "#ffffff", origin="bottom", bevel=0.01)
    S.box("linteau", (1.1, 0.15, 0.1), (2.2, 1.0, 2.15), "#ffffff", origin="bottom", bevel=0.01)
    w.add_anchor("porte_chambre", 2.2, 1.3, 0.0, math.pi * 0.85, 0.6)
    w.add_anchor("pres_canape", 0.9, BY - 1.35, 0.0, math.pi * 1.1, 0.6)
    w.add_anchor("piece", 0, 2.6, 1.0, 0.0, 5)
    w.obstacles.append((-1.5, 0.7, BY - 1.1, BY))
    w.bounds = (-3.0, 3.0, -6.0, BY - 0.3, 0.3, 2.75)
    w.overview = ((0.3, -2.8, 2.1), (-0.2, BY - 0.8, 0.8), 22)
    return w
