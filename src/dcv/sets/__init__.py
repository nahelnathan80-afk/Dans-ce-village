"""Décors réutilisables. Chaque module expose build(ctx) → World.

World décrit ce dont le reste du programme a besoin :
  - anchors : points nommés {nom: (x, y, z, orientation, taille)} — cibles de
    caméra (« table », « photo », « journal »…) et positions (« devant_miroir »)
  - seats   : sièges [{x, y, h, yaw, type}] (banc, chaise, pupitre, lit)
  - zones   : zones de foule {nom: (xmin, xmax, ymin, ymax)}
  - bounds  : limites de la caméra (intérieurs) ou None
  - overview: point de vue du « plan large » (position caméra, point visé)
  - text_slots : emplacements des textes paramétrables (affiches, journaux…)
"""
import importlib
import math


class World:
    def __init__(self, name):
        self.name = name
        self.anchors = {}
        self.seats = []
        self.zones = {}
        self.bounds = None          # (xmin, xmax, ymin, ymax, zmin, zmax)
        self.overview = ((0, -8, 3), (0, 3, 1.2), 24)
        self.text_slots = {}
        self.mirror = None          # {"y": plan du miroir, "x": centre, "w": largeur}
        self.obstacles = []         # rectangles (xmin,xmax,ymin,ymax) à éviter pour la foule
        # façade « traversable » : si la caméra passe derrière (y > facade_y), ces objets
        # deviennent invisibles pour elle (plan « depuis l'intérieur de la maison »)
        self.facade_y = None
        self.facade = []

    def anchor(self, name):
        a = self.anchors.get(name)
        return a

    def add_anchor(self, name, x, y, z, yaw=0.0, size=1.0):
        self.anchors[name] = (x, y, z, yaw, size)

    def nearest_seat(self, pos, kind=None):
        cands = [s for s in self.seats if (kind is None or s["type"] == kind) and not s.get("pris")]
        if not cands:
            cands = [s for s in self.seats if not s.get("pris")]
        if not cands:
            return None
        s = min(cands, key=lambda s: math.hypot(s["x"] - pos[0], s["y"] - pos[1]))
        s["pris"] = True
        return s

    def clamp_camera(self, loc):
        if not self.bounds:
            return loc
        x0, x1, y0, y1, z0, z1 = self.bounds
        return (min(x1, max(x0, loc[0])), min(y1, max(y0, loc[1])), min(z1, max(z0, loc[2])))


def build(decor, ctx):
    mod = importlib.import_module(f"dcv.sets.{decor}")
    return mod.build(ctx)


def text_for(ctx, slot, default=None):
    """Texte demandé par le scénario pour un emplacement (ou valeur par défaut)."""
    for t in ctx.get("textes_decor", []):
        if t.get("emplacement") == slot:
            return t
    return {"texte": default, "type": None} if default else None
