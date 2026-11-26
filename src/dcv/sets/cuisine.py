"""Décor « cuisine / salle à manger » : table au centre avec chaises,
assiettes et verres paramétrables ("accessoires": {"chaises": 3, "assiettes": 2}),
plan de travail, frigo, fenêtre, horloge, suspension.
Ancres : piece, table, pres_table, frigo.   Textes : frigo, mur.
"""
import math

from .. import props as P
from .. import scene as S
from . import World, text_for

TX, TY, TH = 0.0, 2.3, 0.75


def build(ctx):
    w = World("cuisine")
    acc = ctx.get("accessoires") or {}
    P.room("cu", 7.0, 5.0, 3.0, "#fff1c1", "#d9a066")
    S.box("mur_fond", (7.0, 0.2, 3.0), (0, 5.1, 0), "#fff1c1", origin="bottom", bevel=0)
    # carrelage mural + plan de travail + placards
    S.box("credence", (4.4, 0.03, 0.6), (0.8, 4.985, 0.9), "#9be3de", origin="bottom", bevel=0)
    S.box("plan_travail", (4.4, 0.65, 0.9), (0.8, 4.65, 0), "#ffffff", origin="bottom", bevel=0.02)
    S.box("dessus", (4.5, 0.7, 0.05), (0.8, 4.65, 0.9), "#5d6d7e", origin="bottom", bevel=0.01)
    for k in range(4):
        S.box("placard", (1.0, 0.4, 0.7), (-0.7 + k * 1.05, 4.8, 1.85), "#ff9f80", origin="bottom", bevel=0.02)
    S.box("frigo", (0.8, 0.7, 1.9), (-2.8, 4.55, 0), "#e8f1f2", origin="bottom", bevel=0.04)
    S.box("plaques", (0.6, 0.5, 0.02), (1.8, 4.65, 0.95), "#222222", origin="bottom", bevel=0)
    P.window("fenetre", 0.3, 5.0, 1.45, 1.2, 0.9, sky=ctx.get("ciel_fenetre", "#9fd3ff"), emit=ctx.get("fenetre_emit", 1.2))
    # horloge
    S.cylinder("horloge", 0.22, 0.05, (2.6, 4.98, 2.1), "#ffffff", verts=20).rotation_euler = (math.pi / 2, 0, 0)
    # table + nappe
    P.table("table", TX, TY, 1.7, 1.1, TH, "#b07a4f")
    S.box("nappe", (1.4, 0.9, 0.01), (TX, TY, TH), "#e05a6a", origin="bottom", bevel=0)   # nappe rouge : assiettes bien visibles
    # chaises : gauche, droite, fond (puis devant si 4)
    places = [(-1.05, TY, -math.pi / 2), (1.05, TY, math.pi / 2), (TX, TY + 0.8, 0.0), (TX, TY - 0.8, math.pi)]
    n_ch = int(acc.get("chaises", 3))
    for k, (x, y, yaw) in enumerate(places[:n_ch]):
        P.chair(f"chaise{k}", x, y, yaw, ["#ef476f", "#06d6a0", "#ffd166", "#118ab2"][k])
        w.seats.append({"x": x, "y": y, "h": 0.45, "yaw": yaw, "type": "chaise"})
    # assiettes et verres devant les premières places
    n_as = int(acc.get("assiettes", n_ch))
    for k, (x, y, yaw) in enumerate(places[:n_as]):
        px = TX + (x - TX) * 0.55
        py = TY + (y - TY) * 0.55
        P.plate(f"assiette{k}", px, py, TH + 0.01)
        P.glass(f"verre{k}", px + 0.18, py + 0.12, TH + 0.01)
    # suspension
    S.box("applique", (0.4, 0.15, 0.25), (-1.6, 4.95, 2.1), mat=S.material("#ffd166", 0.5, emit=0.8), origin="bottom", bevel=0.03)
    t = text_for(ctx, "frigo")
    if t:
        P.text_panel(ctx, "frigo_note", t.get("type") or "affiche", t["texte"], (-2.8, 4.19, 1.3), 0.35)
    w.add_anchor("piece", 0, 2.8, 1.0, 0.0, 6)
    w.add_anchor("table", TX, TY + 0.1, TH, "haut", 1.8)
    w.add_anchor("pres_table", 1.55, 3.25, 0.0, math.pi * 0.8, 0.5)
    w.add_anchor("frigo", -2.8, 4.2, 1.2, 0.0, 1.0)
    w.obstacles.append((-1.4, 1.4, 1.6, 3.1))
    w.bounds = (-3.2, 3.2, -6.0, 4.2, 0.3, 2.85)
    w.overview = ((0.0, -3.0, 2.4), (0.0, 3.2, 0.9), 20)
    return w
