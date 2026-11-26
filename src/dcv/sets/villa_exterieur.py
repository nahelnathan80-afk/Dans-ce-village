"""Décor « villa (extérieur) » : grande villa cubique blanche, piscine, palmiers,
portail doré (enseigne réglable, emplacement « portail »), pancarte de règle
(emplacement « panneau_regle »), allée.
Paramètre "villa": {"remplissage": 0..1, "matelas": N} → têtes qui débordent
des fenêtres, porte bloquée par la foule, pile de matelas jusqu'au toit.
La nuit (ambiance avec "guirlandes"), des guirlandes lumineuses s'allument.
Ancres : villa, portail, devant_portail, bord_piscine, panneau_regle, porte_villa,
matelas, piscine, palmier.   Zones : allee, devant_villa, portail.
"""
import math
import random

from .. import props as P
from .. import scene as S
from . import World, text_for

VY = 9.0        # façade avant de la villa


def build(ctx):
    rng = random.Random(4)
    w = World("villa_exterieur")
    night = ctx.get("nuit", False)
    vil = ctx.get("villa") or {}
    fill = float(vil.get("remplissage", 0.0))
    # sol : pelouse + allée + trottoir
    S.box("trottoir", (60, 6, 0.1), (0, -2.0, -0.1), "#e3cfa8", origin="bottom", bevel=0)
    S.box("pelouse", (60, 30, 0.1), (0, 16.0, -0.1), "#7ed957", origin="bottom", bevel=0)
    S.box("allee", (2.6, VY - 1.0, 0.012), (0, (1.0 + VY) / 2, 0), "#f1e4c8", origin="bottom", bevel=0)
    # mur d'enceinte bas + portail doré
    for sx in (-1, 1):
        S.box("muret", (11.0, 0.3, 0.9), (sx * (1.9 + 5.5), 1.0, 0), "#ffffff", origin="bottom", bevel=0.03)
        S.box("pilier", (0.5, 0.5, 2.6), (sx * 1.7, 1.0, 0), "#e8b923", mat=S.material("#e8b923", 0.25, metal=0.6), origin="bottom", bevel=0.04)
        S.box("pilier_boule", (0.38, 0.38, 0.38), (sx * 1.7, 1.0, 2.6), mat=S.material("#ffd34d", 0.2, metal=0.7), origin="bottom", bevel=0.12)
        # battants ouverts (barreaux dorés)
        e = S.empty("battant", (sx * 1.45, 1.0, 0))
        e.rotation_euler = (0, 0, sx * 1.2)
        for k in range(6):
            S.box("barreau", (0.05, 0.05, 1.8), (-sx * (0.12 + k * 0.22), 0, 0.1), mat=S.material("#e8b923", 0.25, metal=0.6),
                  parent=e, origin="bottom", bevel=0)
        S.box("traverse", (1.35, 0.05, 0.06), (-sx * 0.67, 0, 1.0), mat=S.material("#e8b923", 0.25, metal=0.6), parent=e, origin="bottom", bevel=0)
    t = text_for(ctx, "portail", "VILLA KADO\nENTRÉE LIBRE")
    P.text_panel(ctx, "portail", "portail", t["texte"], (0, 0.97, 3.25), 3.3, emit=0.45)
    w.add_anchor("portail", 0, 0.97, 3.1, 0.0, 3.0)
    w.add_anchor("devant_portail", 0.9, -0.2, 0.0, 0.0, 1.0)
    # pancarte de règle (à gauche de l'allée, derrière le portail)
    t = text_for(ctx, "panneau_regle")
    if t:
        S.box("pancarte_pied", (0.12, 0.12, 1.7), (-2.6, 2.4, 0), "#7a5232", origin="bottom", bevel=0.01)
        P.text_panel(ctx, "panneau_regle", t.get("type") or "pancarte", t["texte"], (-2.6, 2.33, 1.95), 1.8, emit=0.3)
        w.add_anchor("panneau_regle", -2.6, 2.33, 1.95, 0.0, 1.5)
    # villa : bloc principal + étage décalé + toit-terrasse
    S.box("villa", (14, 6, 4.2), (0, VY + 3, 0), "#fbfbfb", origin="bottom", bevel=0.05)
    S.box("villa_etage", (9, 5, 3.4), (-1.5, VY + 3.5, 4.2), "#ffffff", origin="bottom", bevel=0.05)
    S.box("villa_corniche", (14.3, 6.3, 0.2), (0, VY + 3, 4.2), "#e6e6e6", origin="bottom", bevel=0.02)
    S.box("villa_corniche2", (9.3, 5.3, 0.2), (-1.5, VY + 3.5, 7.6), "#e6e6e6", origin="bottom", bevel=0.02)
    glass = S.material("#ffd59e" if night else "#5aa9e6", 0.15, emit=2.2 if night else 0.25)
    wins = [(-5.0, 0.9, 2.2, 2.0), (5.0, 0.9, 2.2, 2.0), (-4.5, 5.0, 2.0, 1.6), (-1.5, 5.0, 2.0, 1.6), (1.5, 5.0, 2.0, 1.6)]
    for i, (wx, wz, ww, wh) in enumerate(wins):
        yface = VY if wz < 4 else VY + 1.0
        S.box("fen_cadre", (ww + 0.16, 0.12, wh + 0.16), (wx, yface - 0.02, wz - 0.08), "#d4d4d4", origin="bottom", bevel=0.01)
        S.box("fen_vitre", (ww, 0.14, wh), (wx, yface - 0.03, wz), mat=glass, origin="bottom", bevel=0)
        if fill > 0:
            P.window_heads(f"fen{i}", wx, yface - 0.05, wz + 0.15, ww * min(1, fill + 0.2), rng)
            if fill > 0.5:
                P.window_heads(f"fenb{i}", wx, yface - 0.05, wz + 0.75, ww * 0.8, rng)
    # porte (bloquée par la foule si pleine)
    S.box("porte_cadre", (2.0, 0.14, 2.6), (0, VY - 0.02, 0), "#c9a227", origin="bottom", bevel=0.02)
    if fill > 0.6:
        S.box("porte_ouverte", (0.1, 1.6, 2.4), (-0.95, VY - 0.8, 0), "#ffffff", origin="bottom", bevel=0.02, rot=(0, 0, 0.0))
        for k in range(3):
            P.window_heads(f"porte{k}", 0, VY - 0.1 - k * 0.05, 0.9 + k * 0.45, 1.6, rng)
    else:
        S.box("porte", (1.8, 0.16, 2.45), (0, VY - 0.03, 0), "#ffffff", origin="bottom", bevel=0.02)
        S.box("poignee", (0.08, 0.06, 0.3), (0.65, VY - 0.13, 1.1), mat=S.material("#e8b923", 0.25, metal=0.6), origin="bottom", bevel=0.01)
    w.add_anchor("porte_villa", 0, VY - 0.1, 1.3, 0.0, 1.6)
    w.add_anchor("villa", 0, VY, 3.0, 0.0, 6)
    # piscine (à droite)
    S.box("piscine_bord", (5.4, 3.6, 0.18), (6.2, 5.2, 0), "#ffffff", origin="bottom", bevel=0.03)
    S.box("piscine_eau", (4.8, 3.0, 0.05), (6.2, 5.2, 0.15), mat=S.material("#38c6f4", 0.05, emit=0.6 if night else 0.25), origin="bottom", bevel=0)
    S.box("bouee", (0.6, 0.6, 0.12), (5.6, 4.8, 0.2), "#ff4d6d", origin="bottom", bevel=0.1)
    w.add_anchor("piscine", 6.2, 5.2, 0.3, 0.0, 3)
    w.add_anchor("bord_piscine", 3.1, 4.2, 0.0, 0.0, 1)
    # palmiers
    for (px, py) in ((-6.5, 6.8), (-9.5, 5.0), (9.6, 7.2), (3.2, 7.6)):
        top = P.palm(f"palmier{px}", px, py, 1.15)
    w.add_anchor("palmier", -6.5, 6.8, 3.0, 0.0, 2)
    # matelas empilés jusqu'au toit (à gauche de la façade)
    n = int(vil.get("matelas", 0))
    if n:
        h = P.mattress_stack("pile", -8.6, VY - 0.8, n)
        w.add_anchor("matelas", -8.6, VY - 1.3, h / 2, 0.0, max(1.5, h / 2.2))
    # guirlandes la nuit
    if ctx.get("guirlandes") or night:
        P.garland("g1", (-7, VY - 0.1, 4.1), (7, VY - 0.1, 4.1), 26, 0.35)
        P.garland("g2", (-1.7, 1.0, 2.55), (-6.5, 6.8, 3.3), 14, 0.5)
        P.garland("g3", (1.7, 1.0, 2.55), (3.2, 7.6, 3.3), 14, 0.5)
    w.zones = {"allee": (-1.2, 1.2, 2.0, VY - 1.0), "devant_villa": (-6.0, 6.0, 5.5, VY - 0.6),
               "portail": (-2.6, 2.6, 0.3, 2.8), "trottoirs": (-6, 6, -1.5, 0.5)}
    w.overview = ((0.6, -6.5, 2.6), (0.0, VY, 2.6), 26)
    return w
