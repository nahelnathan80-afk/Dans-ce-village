"""Décor « chambre vide remplie de cartons » : même pièce que la chambre
d'ado, mais vidée — murs nus (traces claires des posters), cartons empilés,
cadre de porte au premier plan. Le journal par terre est un texte
paramétrable (emplacement « sol »).
Ancres : piece, porte, journal, cartons.   Textes : sol, carton1..3.
"""
import math
import random

from .. import props as P
from .. import scene as S
from . import World, text_for
from .chambre_ado import FLOOR, MY, WALL


def build(ctx):
    rng = random.Random(3)
    w = World("chambre_cartons")
    P.room("ch", 7.0, 5.0, 3.0, WALL, FLOOR)
    S.box("mur_fond", (7.0, 0.2, 3.0), (0, MY + 0.1, 0), WALL, origin="bottom", bevel=0)
    P.window("fenetre", -1.6, MY, 1.1, 1.3, 1.3, sky=ctx.get("ciel_fenetre", "#9fd3ff"), emit=ctx.get("fenetre_emit", 1.2))
    # traces plus claires des posters et du miroir enlevés
    S.box("trace1", (0.04, 0.9, 1.2), (-3.48, 2.6, 0.95), "#c9ebf5", origin="bottom", bevel=0)
    S.box("trace2", (1.0, 0.02, 1.7), (0.9, MY - 0.01, 0.3), "#c9ebf5", origin="bottom", bevel=0)
    # cartons empilés
    labels = ["LIVRES", "VÊTEMENTS", "CHAMBRE", "", "FRAGILE", ""]
    k = 0
    for (x, y, n) in ((-2.4, 4.2, 3), (-1.4, 4.4, 2), (2.2, 4.1, 3), (2.9, 3.0, 1), (-2.8, 2.6, 2)):
        z = 0.0
        for j in range(n):
            s = rng.uniform(0.55, 0.7)
            S.box("carton", (s, s * 0.9, s * 0.75), (x + rng.uniform(-0.05, 0.05), y, z), "#c4965f",
                  origin="bottom", bevel=0.01, rot=(0, 0, rng.uniform(-0.15, 0.15)))
            S.box("scotch", (s * 1.01, 0.08, s * 0.76), (x, y - s * 0.4, z), "#e0c28f", origin="bottom", bevel=0)
            lab = labels[k % len(labels)]
            if lab and j == 0:
                P.text_panel(ctx, f"lab{k}", "panneau", lab, (x, y - s * 0.455, z + s * 0.5), s * 0.7,
                             emit=0.15)
            z += s * 0.75
            k += 1
    # journal par terre (texte paramétrable)
    t = text_for(ctx, "sol", "ACCIDENT HIER SOIR\nRUE DES LILAS")
    JX, JY = 0.4, 2.1
    P.text_panel(ctx, "journal", "journal", t["texte"], (JX, JY, 0.006), 0.62, rot=(0, 0, 0.18), emit=0.35)
    w.add_anchor("journal", JX, JY, 0.0, "haut", 0.7)
    w.add_anchor("sol", JX, JY, 0.0, "haut", 0.7)
    # cadre de porte (premier plan) : Léo l'ouvre
    for sx in (-0.55, 0.55):
        S.box("chambranle", (0.1, 0.15, 2.15), (sx, 0.0, 0), "#ffffff", origin="bottom", bevel=0.01)
    S.box("linteau", (1.2, 0.15, 0.1), (0, 0.0, 2.15), "#ffffff", origin="bottom", bevel=0.01)
    porte = S.empty("porte_pivot", (0.5, 0.0, 0))
    porte.rotation_euler = (0, 0, -1.9)
    S.box("porte", (0.95, 0.05, 2.1), (-0.5, 0, 0), "#f7f1e3", parent=porte, origin="bottom", bevel=0.01)
    w.add_anchor("piece", 0, 3.0, 1.0, 0.0, 6)
    w.add_anchor("porte", 0, 0.0, 1.1, 0.0, 1.2)
    w.add_anchor("cartons", -2.0, 4.2, 0.8, 0.0, 2)
    w.bounds = (-3.2, 3.2, -6.0, 4.7, 0.3, 2.85)
    w.overview = ((0.0, -3.2, 2.3), (0.0, 3.4, 0.8), 20)
    return w
