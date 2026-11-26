"""Personnage cubique paramétré par un fichier personnages/<nom>.json.

Hiérarchie (toutes les articulations sont des « empties ») :
  root (position au sol, orientation)
    hips (hauteur du bassin : s'asseoir, sauter)
      torse, cou → tête (+ visage 2D, cheveux, chapeau)
      épaule G/D → bras + main
      hanche G/D → jambe + chaussure
    compteur (panneau face caméra au-dessus de la tête)

Le personnage regarde vers -Y quand son orientation vaut 0.
Son côté « gauche » est en +X (vu de face, à droite de l'image).
"""
import math

import bpy

from . import scene as S

GABARITS = {
    #            taille, tête, largeur torse, profondeur torse
    "enfant": (1.32, 0.44, 0.46, 0.26),
    "ado": (1.48, 0.44, 0.50, 0.28),
    "adulte": (1.78, 0.44, 0.58, 0.32),
    "age": (1.70, 0.44, 0.58, 0.34),
}


class Rig:
    """Références vers les pièces animables d'un personnage."""

    def __init__(self, name, d):
        self.name = name
        self.d = d
        self.materials = []


def _darker(hexcol, k=0.75):
    c = hexcol.lstrip("#")
    r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
    return "#%02x%02x%02x" % (int(r * k), int(g * k), int(b * k))


def build(defn: dict, name: str, face_mat, counter_mat=None, cam=None, unique_mats=False, coll=None, counter_aspect=1024 / 300):
    """Construit le personnage. face_mat : matériau du visage (séquence d'images).
    unique_mats=True : matériaux propres au personnage (pour l'effet de transparence)."""
    c = defn.get("couleurs", {})
    gab = GABARITS.get(defn.get("gabarit", "adulte"), GABARITS["adulte"])
    H = float(defn.get("taille", gab[0]))
    hs = gab[1]
    tw, td = gab[2], gab[3]
    body = H - hs
    leg = body * 0.50
    torso = body * 0.50
    arm = torso * 0.95
    aw = 0.13 if H < 1.6 else 0.15
    lw = tw / 2 - 0.015
    r = Rig(name, defn)
    r.H, r.hs, r.leg, r.torso, r.tw, r.td, r.arm = H, hs, leg, torso, tw, td, arm

    def M(col, rough=0.65):
        if unique_mats:
            m = S.material(col, rough, unique=True)
            r.materials.append(m)
            return m
        return S.material(col, rough)

    skin = M(c.get("peau", "#f2c9a0"))
    top = M(c.get("haut", "#4d8fd6"))
    if defn.get("motif_haut"):          # chemise à fleurs, pyjama rayé…
        top = S.pattern_material(defn["motif_haut"], c.get("haut", "#4d8fd6"), c.get("motif_couleur"),
                                 unique=unique_mats)
        if unique_mats:
            r.materials.append(top)
    bottom = M(c.get("bas", "#34435e"))
    shoes = M(c.get("chaussures", "#2a2a2a"))
    hair = M(c.get("cheveux", "#4a3020"), 0.8)

    r.root = S.empty(f"{name}_root", coll=coll)
    r.hips = S.empty(f"{name}_hips", (0, 0, leg), r.root, coll=coll)
    # torse
    S.box(f"{name}_torse", (tw, td, torso), (0, 0, 0), mat=top, parent=r.hips, origin="bottom", bevel=0.03, coll=coll)
    haut = defn.get("haut", "tshirt")
    if haut == "sweat":   # poche ventrale + capuche + cordons
        S.box(f"{name}_poche", (tw * 0.62, 0.02, torso * 0.28), (0, -td / 2 - 0.005, torso * 0.12),
              mat=M(_darker(c.get("haut", "#ffd21f"), 0.85)), parent=r.hips, origin="bottom", bevel=0.005, coll=coll)
        S.box(f"{name}_capuche", (tw * 0.8, 0.12, 0.14), (0, td / 2 + 0.02, torso - 0.1),
              mat=M(_darker(c.get("haut", "#ffd21f"), 0.9)), parent=r.hips, origin="bottom", bevel=0.03, coll=coll)
        for sx in (-0.06, 0.06):
            S.box(f"{name}_cordon", (0.018, 0.015, torso * 0.3), (sx, -td / 2 - 0.008, torso * 0.62),
                  color="#ffffff", parent=r.hips, origin="bottom", bevel=0, coll=coll)
    elif haut == "chemise":
        S.box(f"{name}_col", (tw * 0.5, 0.02, 0.09), (0, -td / 2 - 0.004, torso - 0.09),
              color="#ffffff", parent=r.hips, origin="bottom", bevel=0.005, coll=coll)
    elif haut == "gilet":
        for sx in (-1, 1):
            S.box(f"{name}_gilet", (tw * 0.3, 0.02, torso * 0.92), (sx * tw * 0.33, -td / 2 - 0.004, 0.02),
                  mat=M(c.get("gilet", "#7a4b2a")), parent=r.hips, origin="bottom", bevel=0.005, coll=coll)
    elif haut == "robe":
        S.box(f"{name}_jupe", (tw * 1.05, td * 1.15, leg * 0.55), (0, 0, -leg * 0.55), mat=top,
              parent=r.hips, origin="bottom", bevel=0.03, coll=coll)
    if any(a.get("type") == "cravate" for a in defn.get("accessoires", [])):
        S.box(f"{name}_cravate", (0.07, 0.02, torso * 0.6), (0, -td / 2 - 0.008, torso * 0.35),
              color="#b22234", parent=r.hips, origin="bottom", bevel=0.005, coll=coll)

    # tête
    r.neck = S.empty(f"{name}_neck", (0, 0, torso), r.hips, coll=coll)
    r.head = S.box(f"{name}_tete", (hs, hs, hs), (0, 0, 0.02), mat=skin, parent=r.neck, origin="bottom", bevel=0.04, coll=coll)
    r.face = S.plane(f"{name}_visage", hs * 0.94, hs * 0.94, (0, -hs / 2 - 0.004, 0.02 + hs / 2), face_mat, parent=r.neck, coll=coll)
    if unique_mats:
        r.materials.append(face_mat)
    _hair(r, defn, hair, M, coll)
    r.head_top = 0.02 + hs

    # bras (pivot à l'épaule) — « gauche » = +X
    r.arms = []
    for side, sx in (("g", 1), ("d", -1)):
        sh = S.empty(f"{name}_epaule_{side}", (sx * (tw / 2 + aw / 2 + 0.005), 0, torso - 0.06), r.hips, coll=coll)
        S.box(f"{name}_bras_{side}", (aw, aw, arm * 0.8), (0, 0, -arm * 0.8), mat=top, parent=sh, origin="bottom", bevel=0.025, coll=coll)
        S.box(f"{name}_main_{side}", (aw * 0.9, aw * 0.9, arm * 0.2), (0, 0, -arm), mat=skin, parent=sh, origin="bottom", bevel=0.02, coll=coll)
        r.arms.append(sh)
    # jambes (pivot à la hanche)
    r.legs = []
    for side, sx in (("g", 1), ("d", -1)):
        hp = S.empty(f"{name}_hanche_{side}", (sx * (lw / 2 + 0.008), 0, 0), r.hips, coll=coll)
        S.box(f"{name}_jambe_{side}", (lw, td * 0.85, leg - 0.08), (0, 0, -(leg - 0.08)), mat=bottom, parent=hp, origin="bottom", bevel=0.02, coll=coll)
        S.box(f"{name}_chaussure_{side}", (lw * 1.02, td * 1.05, 0.08), (0, -0.03, -leg), mat=shoes, parent=hp, origin="bottom", bevel=0.02, coll=coll)
        r.legs.append(hp)

    # accessoires
    for a in defn.get("accessoires", []):
        t = a.get("type")
        col = a.get("couleur", "#d62828")
        if t == "echarpe":
            m = M(col)
            S.box(f"{name}_echarpe", (tw * 0.8, td * 1.25, 0.11), (0, 0, torso - 0.1), mat=m, parent=r.hips, origin="bottom", bevel=0.03, coll=coll)
            S.box(f"{name}_echarpe2", (0.11, 0.05, torso * 0.45), (tw * 0.2, -td / 2 - 0.03, torso * 0.45), mat=m, parent=r.hips, origin="bottom", bevel=0.02, coll=coll)
        elif t == "sac":
            S.box(f"{name}_sac", (tw * 0.75, 0.16, torso * 0.7), (0, td / 2 + 0.08, torso * 0.2), mat=M(col), parent=r.hips, origin="bottom", bevel=0.03, coll=coll)
        elif t == "tablier":
            S.box(f"{name}_tablier", (tw * 0.8, 0.02, torso * 0.75 + leg * 0.35), (0, -td / 2 - 0.012, -leg * 0.35),
                  mat=M(col), parent=r.hips, origin="bottom", bevel=0.005, coll=coll)
            S.box(f"{name}_tablier_poche", (tw * 0.4, 0.022, 0.12), (0, -td / 2 - 0.016, 0.02),
                  color="#ffffff", parent=r.hips, origin="bottom", bevel=0.005, coll=coll)
        elif t == "telephone":
            S.box(f"{name}_tel", (0.09, 0.02, 0.17), (0, -aw * 0.6, -arm - 0.06), color="#1b1b25",
                  parent=r.arms[1], origin="bottom", bevel=0.01, coll=coll)
            S.box(f"{name}_ecran", (0.075, 0.005, 0.14), (0, -aw * 0.6 - 0.012, -arm - 0.045),
                  mat=S.material("#7fd8ff", 0.2, emit=1.5), parent=r.arms[1], origin="bottom", bevel=0, coll=coll)
        elif t == "voile":
            S.box(f"{name}_voile", (hs * 1.1, 0.06, hs * 0.95 + torso * 0.7), (0, hs * 0.56, 0.02 + hs * 0.95 - (hs * 0.95 + torso * 0.7)),
                  mat=S.material("#ffffff", 0.4, emit=0.15), parent=r.neck, origin="bottom", bevel=0.02, coll=coll)
        elif t == "noeud_pap":
            S.box(f"{name}_noeud", (0.14, 0.03, 0.06), (0, -td / 2 - 0.01, torso - 0.08), color=col,
                  parent=r.hips, origin="bottom", bevel=0.01, coll=coll)
        elif t == "canne":
            S.box(f"{name}_canne", (0.035, 0.035, H * 0.55), (0, -0.05, -H * 0.55 + 0.05), color="#6b4423", parent=r.arms[1], origin="bottom", bevel=0, coll=coll)

    # compteur au-dessus de la tête
    r.counter = None
    if counter_mat is not None:
        ch = 0.66 * 300 / 1024
        cw = ch * counter_aspect
        r.counter = S.plane(f"{name}_compteur", cw, ch, (0, 0, torso + r.head_top + 0.26), counter_mat, parent=r.hips, coll=coll)
        if cam is not None:
            S.billboard(r.counter, cam)
    r.counter_z = leg + torso + r.head_top + 0.26
    return r


def _hair(r, defn, hair, M, coll):
    hs, n = r.hs, r.name
    st = defn.get("coiffure", "courte")
    acc = {a.get("type"): a for a in defn.get("accessoires", [])}
    z0 = 0.02
    if "casquette" in acc:
        m = M(acc["casquette"].get("couleur", "#ff8800"))
        S.box(f"{n}_casquette", (hs * 1.06, hs * 1.06, hs * 0.24), (0, 0, z0 + hs * 0.86), mat=m, parent=r.neck, origin="bottom", bevel=0.04, coll=coll)
        S.box(f"{n}_visiere", (hs * 0.9, hs * 0.4, 0.04), (0, -hs * 0.66, z0 + hs * 0.86), mat=m, parent=r.neck, origin="bottom", bevel=0.01, coll=coll)
        return
    if "bonnet_nuit" in acc:
        col = acc["bonnet_nuit"].get("couleur", "#6c8cff")
        m = M(col)
        S.box(f"{n}_bnuit", (hs * 1.08, hs * 1.08, hs * 0.3), (0, 0, z0 + hs * 0.8), mat=m, parent=r.neck, origin="bottom", bevel=0.05, coll=coll)
        S.box(f"{n}_bnuit2", (hs * 0.6, hs * 0.6, hs * 0.3), (hs * 0.15, 0.05, z0 + hs * 1.05), mat=m, parent=r.neck, origin="bottom", rot=(0, 0.5, 0), bevel=0.05, coll=coll)
        S.box(f"{n}_bnuit3", (hs * 0.3, hs * 0.3, hs * 0.35), (hs * 0.42, 0.05, z0 + hs * 1.12), mat=m, parent=r.neck, origin="bottom", rot=(0, 1.1, 0), bevel=0.04, coll=coll)
        S.box(f"{n}_bnuit_pompon", (hs * 0.2, hs * 0.2, hs * 0.2), (hs * 0.72, 0.05, z0 + hs * 1.12), color="#ffffff", parent=r.neck, origin="bottom", bevel=0.05, coll=coll)
        return
    if "bonnet" in acc:
        m = M(acc["bonnet"].get("couleur", "#d62828"))
        S.box(f"{n}_bonnet", (hs * 1.08, hs * 1.08, hs * 0.36), (0, 0, z0 + hs * 0.74), mat=m, parent=r.neck, origin="bottom", bevel=0.05, coll=coll)
        S.box(f"{n}_bonnet_bord", (hs * 1.12, hs * 1.12, hs * 0.12), (0, 0, z0 + hs * 0.70), mat=M(_darker(acc["bonnet"].get("couleur", "#d62828"), 0.8)), parent=r.neck, origin="bottom", bevel=0.03, coll=coll)
        S.box(f"{n}_pompon", (hs * 0.22, hs * 0.22, hs * 0.18), (0, 0, z0 + hs * 1.08), color="#ffffff", parent=r.neck, origin="bottom", bevel=0.04, coll=coll)
        if st in ("longue", "queue"):
            S.box(f"{n}_cheveux_dos", (hs * 1.04, hs * 0.2, hs * 0.9), (0, hs * 0.46, z0 + hs * -0.15), mat=hair, parent=r.neck, origin="bottom", bevel=0.03, coll=coll)
        return
    if st == "chauve":       # couronne de cheveux blancs sur les côtés
        for sx in (-1, 1):
            S.box(f"{n}_tempe", (0.05, hs * 0.8, hs * 0.3), (sx * hs * 0.51, 0.04, z0 + hs * 0.35), mat=hair, parent=r.neck, origin="bottom", bevel=0.02, coll=coll)
        S.box(f"{n}_nuque", (hs * 1.04, 0.05, hs * 0.3), (0, hs * 0.51, z0 + hs * 0.35), mat=hair, parent=r.neck, origin="bottom", bevel=0.02, coll=coll)
        return
    # dessus de tête commun
    S.box(f"{n}_cheveux", (hs * 1.06, hs * 1.06, hs * 0.2), (0, 0.0, z0 + hs * 0.88), mat=hair, parent=r.neck, origin="bottom", bevel=0.04, coll=coll)
    S.box(f"{n}_cheveux_dos", (hs * 1.06, hs * 0.16, hs * 0.55), (0, hs * 0.47, z0 + hs * 0.4), mat=hair, parent=r.neck, origin="bottom", bevel=0.03, coll=coll)
    if st == "meche":
        S.box(f"{n}_meche", (hs * 0.62, hs * 0.12, hs * 0.2), (-hs * 0.18, -hs * 0.5, z0 + hs * 0.78), mat=hair, parent=r.neck,
              origin="bottom", rot=(0, 0.25, 0), bevel=0.02, coll=coll)
    elif st == "bouclee":
        for k in range(5):
            S.box(f"{n}_boucle{k}", (hs * 0.28, hs * 0.28, hs * 0.22), (-hs * 0.4 + k * hs * 0.2, -hs * 0.36, z0 + hs * 0.95), mat=hair, parent=r.neck, origin="bottom", bevel=0.05, coll=coll)
    elif st in ("longue", "queue"):
        for sx in (-1, 1):
            S.box(f"{n}_meche_cote", (hs * 0.12, hs * 0.5, hs * 0.85), (sx * hs * 0.53, hs * 0.12, z0 + hs * 0.05), mat=hair, parent=r.neck, origin="bottom", bevel=0.03, coll=coll)
        S.box(f"{n}_frange", (hs * 1.0, hs * 0.1, hs * 0.14), (0, -hs * 0.5, z0 + hs * 0.82), mat=hair, parent=r.neck, origin="bottom", bevel=0.02, coll=coll)
        if st == "longue":
            S.box(f"{n}_cheveux_long", (hs * 1.06, hs * 0.18, hs * 0.75), (0, hs * 0.48, z0 - hs * 0.3), mat=hair, parent=r.neck, origin="bottom", bevel=0.03, coll=coll)
        else:
            S.box(f"{n}_queue", (hs * 0.22, hs * 0.22, hs * 0.55), (0, hs * 0.62, z0 + hs * 0.2), mat=hair, parent=r.neck, origin="bottom", bevel=0.05, coll=coll)
    else:   # courte : petite frange
        S.box(f"{n}_frange", (hs * 1.0, hs * 0.1, hs * 0.12), (0, -hs * 0.5, z0 + hs * 0.84), mat=hair, parent=r.neck, origin="bottom", bevel=0.02, coll=coll)


def apply_pose(r: Rig, p: dict):
    """Applique une pose calculée par actions.py."""
    r.root.location = (p["x"], p["y"], p.get("root_z", 0.0))
    r.root.rotation_euler = (p.get("root_pitch", 0.0), p.get("root_roll", 0.0), p["yaw"])
    r.hips.location = (0, p.get("dy_hips", 0.0), r.leg + p.get("dz", 0.0))
    r.hips.rotation_euler = (p.get("lean", 0.0), p.get("roll", 0.0), p.get("twist", 0.0))
    r.neck.rotation_euler = (-p.get("head_pitch", 0.0), p.get("head_roll", 0.0), p.get("head_yaw", 0.0))
    for k, sh in enumerate(r.arms):
        a = p.get("arms", [(0, 0, 0), (0, 0, 0)])[k]
        # a = (avant, écarté, vers l'intérieur) en radians ; côté droit en miroir
        s = 1 if k == 0 else -1
        sh.rotation_euler = (-a[0], -s * a[1], -s * a[2])
    for k, hp in enumerate(r.legs):
        hp.rotation_euler = (-p.get("legs", (0, 0))[k], 0, 0)
