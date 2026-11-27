"""Décor « maison de Yanis » (extérieur) : petite maison simple en face de la
villa, porte d'entrée (ancre « porte »), fenêtre avec réveil (emplacement
« fenetre », ex. « 3:00 »), lampe de porche, trottoir. Ancres : devant_porte, porte,
fenetre, maison.
"""
import math

from .. import props as P
from .. import scene as S
from . import World, text_for

HY = 3.2     # façade


def build(ctx):
    w = World("maison_yanis")
    S.box("trottoir", (40, 12, 0.1), (0, -2.0, -0.1), "#d8c3a5", origin="bottom", bevel=0)
    S.box("jardinet", (40, 20, 0.1), (0, 14.0, -0.1), "#6ab04c", origin="bottom", bevel=0)
    S.box("allee", (1.6, HY - 0.6, 0.012), (0, (0.6 + HY) / 2, 0), "#c9b28e", origin="bottom", bevel=0)
    # maison : bloc + toit en escalier (cubique)
    import bpy
    n0 = set(bpy.data.objects.keys())
    S.box("maison", (7.0, 5.0, 3.0), (0, HY + 2.5, 0), "#f6e7cb", origin="bottom", bevel=0.04)
    for k in range(4):
        S.box("toit", (7.4 - k * 1.6, 5.4, 0.45), (0, HY + 2.5, 3.0 + k * 0.45), "#d1495b" if k % 2 == 0 else "#b83b4c",
              origin="bottom", bevel=0.03)
    S.box("porte", (1.1, 0.12, 2.1), (0, HY - 0.04, 0), "#5c3d2e", origin="bottom", bevel=0.03)
    S.box("heurtoir", (0.16, 0.06, 0.16), (0, HY - 0.12, 1.45), "#c9a227", origin="bottom", bevel=0.04)
    S.box("poignee", (0.06, 0.06, 0.22), (0.38, HY - 0.12, 0.95), "#c9a227", origin="bottom", bevel=0.01)
    S.box("paillasson", (1.2, 0.6, 0.03), (0, HY - 0.45, 0), "#a47148", origin="bottom", bevel=0)
    lit = ctx.get("nuit", False)
    S.box("lampe_porche", (0.24, 0.16, 0.3), (0.9, HY - 0.1, 2.3), mat=S.material("#ffd59e", 0.3, emit=9.0 if lit else 0.5),
          origin="bottom", bevel=0.03)
    P.window("fenetre", -2.2, HY, 1.1, 1.3, 1.1, sky="#ffd59e" if lit else "#9fd3ff", emit=1.6 if lit else 0.6)
    t = text_for(ctx, "fenetre")
    if t:
        P.text_panel(ctx, "reveil", t.get("type") or "horloge", t["texte"], (-2.2, HY - 0.09, 1.55), 0.7, emit=2.0)
        w.add_anchor("fenetre", -2.2, HY - 0.1, 1.55, 0.0, 0.6)
    P.window("fenetre2", 2.3, HY, 1.1, 1.3, 1.1, sky="#ffd59e" if lit else "#9fd3ff", emit=1.2 if lit else 0.6)
    # lucarne de l'étage (chambre) : éteinte, ou allumée avec une silhouette derrière
    ma = ctx.get("maison") or {}
    etage = ma.get("fenetre_etage", "eteinte")
    S.box("lucarne", (1.3, 0.8, 1.2), (1.2, HY - 0.1, 3.3), "#f6e7cb", origin="bottom", bevel=0.03)
    S.box("lucarne_toit", (1.5, 1.0, 0.18), (1.2, HY - 0.1, 4.5), "#b83b4c", origin="bottom", bevel=0.03)
    lit_up = etage.startswith("allumee")
    S.box("lucarne_vitre", (0.9, 0.06, 0.8), (1.2, HY - 0.51, 3.45),
          mat=S.material("#ffd59e" if lit_up else "#1b2a4a", 0.2, emit=3.0 if lit_up else 0.1), origin="bottom", bevel=0)
    if etage == "allumee_silhouette":     # tête + épaules en ombre chinoise
        S.box("silh_epaules", (0.6, 0.02, 0.22), (1.2, HY - 0.55, 3.45), "#0b0b12", origin="bottom", bevel=0.02)
        S.box("silh_tete", (0.3, 0.02, 0.3), (1.2, HY - 0.55, 3.67), "#0b0b12", origin="bottom", bevel=0.03)
    w.add_anchor("fenetre_etage", 1.2, HY - 0.56, 3.85, 0.0, 1.0)
    w.facade = [bpy.data.objects[k] for k in set(bpy.data.objects.keys()) - n0]
    # maison du voisin (à gauche), avec une fenêtre OUVERTE où l'on peut placer quelqu'un
    VX = -7.0
    S.box("voisin_g", (1.6, 0.25, 3.0), (VX - 1.6, HY + 0.12, 0), "#d8e2dc", origin="bottom", bevel=0.02)
    S.box("voisin_d", (1.6, 0.25, 3.0), (VX + 1.6, HY + 0.12, 0), "#d8e2dc", origin="bottom", bevel=0.02)
    S.box("voisin_bas", (1.6, 0.25, 1.0), (VX, HY + 0.12, 0), "#d8e2dc", origin="bottom", bevel=0.02)
    S.box("voisin_haut", (1.6, 0.25, 0.6), (VX, HY + 0.12, 2.4), "#d8e2dc", origin="bottom", bevel=0.02)
    S.box("voisin_fond", (4.8, 0.2, 3.0), (VX, HY + 2.4, 0), "#9aa5b1", origin="bottom", bevel=0)
    S.box("voisin_sol", (4.8, 2.4, 0.1), (VX, HY + 1.3, -0.05), "#6d6875", origin="bottom", bevel=0)
    S.box("voisin_toit", (5.2, 2.8, 0.4), (VX, HY + 1.3, 3.0), "#6c757d", origin="bottom", bevel=0.03)
    for sx in (-1, 1):
        S.box("voisin_cote", (0.2, 2.4, 3.0), (VX + sx * 2.4, HY + 1.3, 0), "#d8e2dc", origin="bottom", bevel=0)
    S.box("voisin_rideau", (0.25, 0.05, 1.4), (VX - 0.7, HY + 0.05, 1.0), "#7b2cbf", origin="bottom", bevel=0.01)
    lamp = S.material("#ffcf8a", 0.4, emit=1.5)
    S.box("voisin_lampe", (0.3, 0.3, 0.3), (VX + 1.5, HY + 2.1, 2.2), mat=lamp, origin="bottom", bevel=0.03)
    w.add_anchor("fenetre_voisin", VX, HY + 0.75, 0.0, 0.0, 1.0)
    w.add_anchor("maison_voisin", VX, HY, 1.8, 0.0, 2.5)
    w.facade_y = HY - 0.05
    S.box("boite_lettres", (0.35, 0.3, 1.1), (-1.5, 0.6, 0), "#2a9d8f", origin="bottom", bevel=0.03)
    w.add_anchor("porte", 0, HY - 0.1, 1.2, 0.0, 1.2)
    w.add_anchor("devant_porte", 0.05, HY - 0.75, 0.0, math.pi, 0.5)
    w.add_anchor("maison", 0, HY, 2.0, 0.0, 4)
    w.add_anchor("rue", 0, HY, 1.6, 0.0, 6)
    w.zones = {"trottoirs": (-6, 6, -1.5, 1.5)}
    w.bounds = (-20, 20, -12, HY + 2.0, 0.3, 8)      # la caméra peut entrer (façade invisible pour elle)
    w.overview = ((0.4, -4.2, 1.9), (0.0, HY, 1.5), 26)
    return w
