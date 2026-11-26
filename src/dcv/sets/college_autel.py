"""Décor « devant le collège » avec un petit autel : façade du collège
(nom paramétrable), grille, arbres, et contre la grille un autel —
caisse, photo encadrée du personnage (qui peut s'effacer), fleurs, bougies,
petite carte. Les élèves passent sur le trottoir (zone « passage »).
Ancres : autel, photo, fronton, college.   Textes : fronton, carte.
"""
import math

from .. import props as P
from .. import scene as S
from . import World, text_for

GY = 5.0     # ligne de la grille


def build(ctx):
    w = World("college_autel")
    S.box("sol", (60, 50, 0.1), (0, 3, -0.1), "#e3cfa8", origin="bottom", bevel=0)
    S.box("cour", (30, 6, 0.012), (0, GY + 3, 0), "#d8c3a5", origin="bottom", bevel=0)
    # façade du collège
    S.box("college", (22, 3, 7.5), (0, 11.5, 0), "#ffcf99", origin="bottom", bevel=0.05)
    S.box("college_toit", (22.4, 3.4, 0.4), (0, 11.5, 7.5), "#c8553d", origin="bottom", bevel=0.05)
    for r in range(3):
        for c in range(9):
            x = -9.6 + c * 2.4
            if r == 0 and abs(x) < 2:
                continue
            S.box("fen", (1.2, 0.1, 1.3), (x, 9.98, 0.8 + r * 2.2), "#ffffff", origin="bottom", bevel=0.01)
            S.box("vit", (1.05, 0.12, 1.15), (x, 9.97, 0.87 + r * 2.2), mat=S.material("#4a6fa5", 0.2, emit=0.2), origin="bottom", bevel=0)
    S.box("entree", (2.4, 0.2, 2.4), (0, 9.95, 0), "#5c3d2e", origin="bottom", bevel=0.02)
    t = text_for(ctx, "fronton", "COLLÈGE DES TILLEULS")
    P.text_panel(ctx, "fronton", "panneau", t["texte"], (0, 9.9, 3.0), 4.2, emit=0.3)
    w.add_anchor("fronton", 0, 9.9, 3.0, 0.0, 4.2)
    # grille + portail ouvert
    for k in range(-40, 41):
        x = k * 0.25
        if abs(x) < 1.6:
            continue
        S.box("barreau", (0.04, 0.04, 1.5), (x, GY, 0), "#2b2d42", origin="bottom", bevel=0)
    for z in (0.15, 1.4):
        for sx in (-1, 1):
            S.box("lisse", (8.4, 0.05, 0.05), (sx * 5.8, GY, z), "#2b2d42", origin="bottom", bevel=0)
    for x in (-8.0, 7.5, -4.5, 4.0):
        P.tree(f"arbre{x}", x, GY + 1.5, 1.1, leaf="#6ab04c")
    for lx in (-6.0, 5.5):
        P.street_lamp(f"lamp{lx}", lx, GY - 0.6, lit=ctx.get("lampes", 0.0))
    # --- autel contre la grille, à droite du portail ---
    AX = 2.4
    S.box("caisse", (1.2, 0.5, 0.55), (AX, GY - 0.3, 0), "#a47148", origin="bottom", bevel=0.02)
    S.box("drap", (1.25, 0.52, 0.03), (AX, GY - 0.3, 0.55), "#f8f9fa", origin="bottom", bevel=0.005)
    # photo : chevalet + image (séquence si elle s'efface)
    S.box("chevalet", (0.5, 0.06, 0.66), (AX, GY - 0.2, 0.57), "#3d2c2e", origin="bottom", bevel=0.01,
          rot=(-0.12, 0, 0))
    photo_mat = ctx.get("photo_mat")
    if photo_mat is not None:
        S.plane("photo", 0.44, 0.44 * 760 / 600, (AX, GY - 0.25, 0.9), photo_mat, rot=(math.pi / 2 - 0.12, 0, 0))
    w.add_anchor("photo", AX, GY - 0.25, 0.9, 0.0, 0.5)
    for k, x in enumerate((-0.45, -0.3, 0.3, 0.45, 0.15)):
        P.candle(f"bougie{k}", AX + x, GY - 0.45 + (k % 2) * 0.1, 0.58, 0.12 + 0.05 * (k % 3))
    for k, x in enumerate((-0.9, -0.7, 0.75, 0.95, -0.2, 0.3)):
        P.flowers(f"bouquet{k}", AX + x, GY - 0.6 - (k % 2) * 0.15)
    t = text_for(ctx, "carte", "ON NE T'OUBLIERA\nJAMAIS")
    P.text_panel(ctx, "carte", "panneau", t["texte"], (AX + 0.38, GY - 0.57, 0.66), 0.34, rot=(math.pi / 2 - 0.3, 0, 0),
                 emit=0.2)
    w.add_anchor("autel", AX, GY - 0.35, 0.7, 0.0, 1.6)
    w.add_anchor("college", 0, 9.9, 3.0, 0.0, 12)
    w.add_anchor("piece", 0, 6.0, 1.5, 0.0, 10)
    w.add_anchor("rue", 0, 6.0, 1.5, 0.0, 10)
    w.obstacles.append((AX - 1.2, AX + 1.2, GY - 1.0, GY))
    w.zones = {"passage": (-7.0, 7.0, 1.0, 3.6), "trottoirs": (-7.0, 7.0, 0.8, 4.0), "fond": (-8, 8, 6.5, 9.0)}
    w.overview = ((AX - 0.8, -0.6, 1.8), (AX - 0.3, GY - 0.3, 1.0), 26)
    return w
