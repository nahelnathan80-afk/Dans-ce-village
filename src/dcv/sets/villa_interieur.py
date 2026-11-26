"""Décor « villa (intérieur) » : grand salon-cuisine ouvert. Frigo géant aux portes
ouvertes (ancre « dans_frigo » pour y dormir), lustre doré (ancre « lustre »),
baignoire sur pieds (ancre « baignoire »), deux palmiers en pot (« palmier_dodo »),
canapé blanc, porte de la chambre de Kado au fond, chambre bondée derrière.
Ancres : piece, cuisine, frigo, dans_frigo, lustre, baignoire, palmier_dodo,
porte_chambre_kado, chambre_kado.   Zones : partout, chambre_kado.
"""
import math

from .. import props as P
from .. import scene as S
from . import World

BY = 6.0      # mur du fond


def build(ctx):
    w = World("villa_interieur")
    WALL = "#fff8ee"
    P.room("vi", 11.0, BY, 3.4, WALL, "#e9d5b7")
    # mur du fond percé d'une porte (chambre de Kado), à droite
    DX = 2.6
    S.box("fond_g", (11.0 / 2 + DX - 0.6, 0.2, 3.4), ((-5.5 + DX - 0.6) / 2, BY + 0.1, 0), WALL, origin="bottom", bevel=0)
    S.box("fond_d", (5.5 - DX - 0.6, 0.2, 3.4), ((DX + 0.6 + 5.5) / 2, BY + 0.1, 0), WALL, origin="bottom", bevel=0)
    S.box("fond_h", (1.2, 0.2, 1.2), (DX, BY + 0.1, 2.2), WALL, origin="bottom", bevel=0)
    S.box("chambranle", (1.4, 0.24, 2.3), (DX, BY + 0.1, 0), "#d9b26a", origin="bottom", bevel=0.02)
    S.box("porte_kado", (0.08, 1.1, 2.15), (DX - 0.55, BY - 0.55, 0), "#ffffff", origin="bottom", bevel=0.02, rot=(0, 0, 0.4))
    # chambre de Kado (derrière) : grand lit rond… couvert de dormeurs (foule « chambre_kado »)
    S.box("ch_sol", (3.4, 3.0, 0.1), (DX, BY + 1.6, -0.1), "#d8c3a5", origin="bottom", bevel=0)
    S.box("ch_fond", (3.4, 0.2, 3.4), (DX, BY + 3.1, 0), "#fde2e4", origin="bottom", bevel=0)
    for sx in (-1, 1):
        S.box("ch_cote", (0.2, 3.0, 3.4), (DX + sx * 1.7, BY + 1.6, 0), "#fde2e4", origin="bottom", bevel=0)
    S.box("ch_lit", (2.6, 2.0, 0.5), (DX, BY + 1.9, 0), "#ffcad4", origin="bottom", bevel=0.08)
    S.box("ch_plafond", (3.4, 3.0, 0.1), (DX, BY + 1.6, 3.4), "#ffffff", origin="bottom", bevel=0)
    w.add_anchor("porte_chambre_kado", DX - 0.1, BY - 0.45, 1.1, 0.0, 1.2)
    w.add_anchor("chambre_kado", DX, BY + 1.6, 0.9, 0.0, 1.6)
    # cuisine (à gauche) : plan de travail + FRIGO GÉANT ouvert
    S.box("plan", (3.6, 0.7, 0.92), (-3.4, BY - 0.4, 0), "#ffffff", origin="bottom", bevel=0.02)
    S.box("plan_dessus", (3.7, 0.75, 0.05), (-3.4, BY - 0.4, 0.92), "#3d405b", origin="bottom", bevel=0.01)
    FX, FY = -4.6, 4.6
    # caisse CREUSE (on voit l'intérieur éclairé… et Boubou dedans)
    S.box("frigo_fond", (1.8, 0.1, 2.9), (FX, FY + 0.45, 0), "#e8eef2", origin="bottom", bevel=0.03)
    for sx in (-1, 1):
        S.box("frigo_cote", (0.1, 1.0, 2.9), (FX + sx * 0.85, FY, 0), "#e8eef2", origin="bottom", bevel=0.03)
    S.box("frigo_haut", (1.8, 1.0, 0.1), (FX, FY, 2.8), "#e8eef2", origin="bottom", bevel=0.03)
    S.box("frigo_bas", (1.8, 1.0, 0.5), (FX, FY, 0), "#e8eef2", origin="bottom", bevel=0.03)
    S.box("frigo_interieur", (1.6, 0.05, 2.3), (FX, FY + 0.38, 0.5), mat=S.material("#dff3ff", 0.3, emit=1.2), origin="bottom", bevel=0)
    for z in (1.55, 2.15):
        S.box("frigo_etagere", (1.6, 0.8, 0.04), (FX, FY - 0.05, z), "#ffffff", origin="bottom", bevel=0)
    S.box("frigo_porteG", (0.9, 0.08, 2.85), (FX - 1.25, FY - 0.95, 0.02), "#f1f5f9", origin="bottom", bevel=0.03, rot=(0, 0, 1.2))
    S.box("frigo_porteD", (0.9, 0.08, 2.85), (FX + 1.25, FY - 0.95, 0.02), "#f1f5f9", origin="bottom", bevel=0.03, rot=(0, 0, -1.2))
    for k, c in enumerate(["#ff6b6b", "#ffd166", "#06d6a0"]):
        S.box("frigo_bocal", (0.18, 0.18, 0.25), (FX + 0.55 - k * 0.25, FY + 0.1, 2.04), c, origin="bottom", bevel=0.03)
    w.add_anchor("frigo", FX, FY - 0.5, 1.4, 0.0, 1.4)
    w.add_anchor("dans_frigo", FX, FY + 0.05, 0.5, 0.0, 0.6)
    w.add_anchor("cuisine", -3.8, 4.2, 1.2, 0.0, 2.6)
    # salon : grand canapé blanc, tapis, table basse
    S.box("tapis", (4.0, 2.6, 0.02), (0.0, 2.6, 0), "#f4a261", origin="bottom", bevel=0)
    S.box("canape", (3.0, 0.9, 0.45), (0.0, 3.6, 0), "#ffffff", origin="bottom", bevel=0.06)
    S.box("canape_dos", (3.0, 0.25, 0.5), (0.0, 4.0, 0.45), "#f1f1f1", origin="bottom", bevel=0.06)
    S.box("table_basse", (1.4, 0.7, 0.35), (0.0, 2.3, 0), "#c9a227", origin="bottom", bevel=0.03)
    # lustre doré (on peut dormir dessus)
    LX, LY, LZ = -0.8, 2.8, 2.45
    S.box("lustre_tige", (0.05, 0.05, 0.7), (LX, LY, LZ + 0.25), "#c9a227", origin="bottom", bevel=0)
    S.box("lustre_anneau", (1.5, 1.5, 0.12), (LX, LY, LZ), mat=S.material("#ffd34d", 0.2, metal=0.7), origin="bottom", bevel=0.06)
    for a in range(8):
        ang = a * math.pi / 4
        S.box("lustre_bougie", (0.07, 0.07, 0.18), (LX + 0.7 * math.cos(ang), LY + 0.7 * math.sin(ang), LZ + 0.12),
              mat=S.material("#fff3c4", 0.3, emit=6.0), origin="bottom", bevel=0.01)
    w.add_anchor("lustre", LX, LY, LZ + 0.14, 0.0, 1.4)
    # salle de bain ouverte (à droite) : baignoire sur pieds
    BX, BYb = 4.0, 2.2
    S.box("carrelage", (2.6, 2.4, 0.03), (BX, BYb, 0), "#bde0fe", origin="bottom", bevel=0)
    S.box("baignoire", (1.9, 0.9, 0.6), (BX, BYb, 0.12), "#ffffff", origin="bottom", bevel=0.12)
    S.box("baignoire_eau", (1.7, 0.7, 0.05), (BX, BYb, 0.62), mat=S.material("#a9def9", 0.05, emit=0.3), origin="bottom", bevel=0)
    for sx in (-0.75, 0.75):
        S.box("pied_baign", (0.12, 0.12, 0.12), (BX + sx, BYb, 0), "#c9a227", origin="bottom", bevel=0.03)
    w.add_anchor("baignoire", BX, BYb, 0.55, 0.0, 1.2)
    # palmiers en pot (on dort aussi dessus)
    top = P.palm("palmier_pot1", 3.9, 4.8, 0.62, lean=0.1, pot=True)
    P.palm("palmier_pot2", -2.0, 5.2, 0.6, lean=-0.1, pot=True)
    w.add_anchor("palmier_dodo", top[0], top[1] - 0.1, top[2] - 0.15, 0.0, 1.6)
    if ctx.get("guirlandes") or ctx.get("nuit"):
        P.garland("gi1", (-5.4, BY - 0.15, 3.2), (5.4, BY - 0.15, 3.2), 24, 0.3)
    w.add_anchor("piece", 0, 3.2, 1.2, 0.0, 7)
    w.zones = {"partout": (-3.0, 3.0, 0.8, 3.0), "chambre_kado": (DX - 1.2, DX + 1.2, BY + 1.0, BY + 2.6),
               "trottoirs": (-4, 4, 0.8, 4.5)}
    w.obstacles += [(-1.6, 1.6, 3.1, 4.2), (-0.8, 0.8, 1.9, 2.7), (BX - 1.0, BX + 1.0, BYb - 0.5, BYb + 0.5)]
    w.bounds = (-5.3, 5.3, -7.0, BY - 0.3, 0.3, 3.25)
    w.overview = ((0.0, -3.6, 2.4), (0.0, 3.6, 1.3), 20)
    return w
