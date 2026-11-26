"""Bibliothèque de presets de caméra, choisis par leur nom dans le scénario.

  plan_large, travelling_suivi, gros_plan_visage, gros_plan_objet,
  contre_plongee, plongee, zoom_lent_avant, panoramique, orbite_lente,
  par_dessus_epaule

Chaque preset est une fonction (sujet, u, ts, monde) → (position, point visé,
focale, décalage vertical). u va de 0 à 1 sur la durée du cadrage.

Cibles (« cible » dans le scénario) :
  "leo"            un personnage (vise le visage)
  "compteur:leo"   le compteur au-dessus de sa tête
  "reflet:leo"     son reflet dans le miroir
  "leo>sam"        par-dessus l'épaule de Léo, vers Sam (ou vers une ancre)
  "table", "photo", "journal"…  une ancre du décor
  "rue", "piece", "foule", "autel"  vue d'ensemble

Format vertical 9:16 : on décale légèrement l'image (shift) pour que le
sujet soit au-dessus du centre et laisse la place aux sous-titres (55-70 %).
"""
import math

D2R = math.pi / 180


def ease(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)


def _rot(v, ang):
    c, s = math.cos(ang), math.sin(ang)
    return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)


def _add(p, d, dist, dz=0.0):
    return (p[0] + d[0] * dist, p[1] + d[1] * dist, p[2] + dz)


class Subject:
    """Ce que la caméra filme : points clés en fonction du temps."""

    def __init__(self, kind, head, body, yaw, size=1.0):
        self.kind = kind            # perso | objet | compteur | decor
        self.head = head            # fonction t → (x, y, z) : point principal
        self.body = body            # fonction t → (x, y, z) : centre du corps / objet
        self.yaw = yaw              # fonction t → orientation (ou "haut" pour un objet posé à plat)
        self.size = size

    def front(self, t):
        y = self.yaw(t)
        if y == "haut":
            return (0.0, -1.0)
        return (math.sin(y), -math.cos(y))


def preset(name, subj: Subject, u, t, world, pair=None):
    """Renvoie (loc, cible, focale, shift_y)."""
    f = subj.front(t)
    H = subj.head(t)
    B = subj.body(t)
    k = subj.kind
    flat = subj.yaw(t) == "haut"
    sz = subj.size
    if name == "par_dessus_epaule":
        if pair is not None:
            T = pair.head(t)
        else:
            T = (H[0] + f[0] * 3, H[1] + f[1] * 3, H[2] - 0.1)
        dx, dy = H[0] - T[0], H[1] - T[1]
        n = math.hypot(dx, dy) or 1.0
        d = (dx / n, dy / n)
        side = (-d[1], d[0])
        loc = (H[0] + d[0] * 1.35 + side[0] * 0.55, H[1] + d[1] * 1.35 + side[1] * 0.55, H[2] + 0.18)
        return loc, T, 30, -0.04
    if k == "decor":
        (cl, tg, lens) = world.overview
        if name == "plongee":
            return (cl[0], cl[1] + 1.0, cl[2] + 2.2), tg, lens, 0.0
        if name == "panoramique":
            a = (-1 + 2 * ease(u)) * 0.35
            d = (tg[0] - cl[0], tg[1] - cl[1])
            d = _rot(d, a)
            return cl, (cl[0] + d[0], cl[1] + d[1], tg[2]), lens, -0.02
        if name == "zoom_lent_avant":
            s = 0.25 * ease(u)
            return (cl[0] + (tg[0] - cl[0]) * s, cl[1] + (tg[1] - cl[1]) * s, cl[2] + (tg[2] - cl[2]) * s * 0.5), tg, lens, -0.03
        if name == "travelling_suivi":     # travelling latéral, plus près et plus bas
            dx = -1.6 + 3.2 * u
            near = (cl[0] + (tg[0] - cl[0]) * 0.35 + dx, cl[1] + (tg[1] - cl[1]) * 0.35, cl[2] * 0.8)
            return near, (tg[0] + dx * 0.6, tg[1], tg[2]), lens + 4, -0.04
        drift = 0.6 * (u - 0.5)
        return (cl[0] + drift, cl[1], cl[2]), (tg[0] + drift * 0.5, tg[1], tg[2]), lens, -0.03

    if k == "perso":
        if name == "plan_large":
            d = _rot(f, 18 * D2R + 0.1 * u)
            loc = _add((B[0], B[1], B[2]), d, 5.2, 1.0 + 0.1 * u)
            return loc, (B[0], B[1], B[2] + 0.35), 26, -0.06
        if name == "travelling_suivi":
            d = _rot(f, (50 - 25 * u) * D2R)
            loc = _add(B, d, 2.9, 0.6)
            return loc, (H[0], H[1], H[2] - 0.25), 30, -0.08
        if name == "gros_plan_visage":
            # gros plan « visage + compteur » : tête vers 45 % de la hauteur,
            # compteur entier au-dessus (hors bande du haut), menton au-dessus des sous-titres
            d = _rot(f, (16 - 8 * u) * D2R)
            tg = (H[0], H[1], H[2] - 0.08)
            return _add(tg, d, 2.25 - 0.15 * u, 0.04), tg, 40, 0.0
        if name == "contre_plongee":
            d = _rot(f, 14 * D2R)
            loc = _add((B[0], B[1], 0.0), d, 2.3 - 0.2 * u, 0.32)
            return loc, (H[0], H[1], H[2] + 0.2), 24, -0.02
        if name == "plongee":
            d = _rot(f, 22 * D2R)
            loc = _add(H, d, 1.6 + 0.2 * u, 1.9)
            return loc, (B[0], B[1], B[2]), 30, -0.04
        if name == "zoom_lent_avant":
            d = _rot(f, 8 * D2R)
            dist = 3.2 - 1.6 * ease(u)
            return _add(H, d, dist, 0.05), (H[0], H[1], H[2] - 0.12 * (1 - u)), 40, -0.08
        if name == "panoramique":
            side = (-f[1], f[0])
            loc = _add(B, _rot(f, 12 * D2R), 5.0, 0.8)
            a = ease(u)
            tg = (H[0] + side[0] * 1.2 * (1 - a), H[1] + side[1] * 1.2 * (1 - a), H[2] - 0.1)
            return loc, tg, 30, -0.06
        if name == "orbite_lente":
            d = _rot(f, (-28 + 56 * u) * D2R)
            return _add(H, d, 2.3, 0.15), (H[0], H[1], H[2] - 0.15), 36, -0.08
        if name == "gros_plan_objet":
            d = _rot(f, 10 * D2R)
            return _add(H, d, 1.9, 0.05), H, 50, -0.06

    if k == "compteur":
        d = _rot(f, (12 - 6 * u) * D2R)
        if name in ("contre_plongee",):
            return _add(H, d, 1.6, -0.75), H, 32, -0.02
        if name in ("orbite_lente",):
            d = _rot(f, (-30 + 60 * u) * D2R)
            return _add(H, d, max(2.1, 3.6 * sz), 0.05), H, 45, -0.06
        if name == "zoom_lent_avant":
            return _add(H, d, max(3.2, 4.5 * sz) - 1.2 * ease(u), 0.0), H, 45, -0.06
        dist = max(2.0, 3.4 * sz)
        return _add(H, d, dist - 0.15 * u, 0.03), H, 50, -0.06

    # objets du décor
    if flat:
        if name in ("plongee", "gros_plan_objet", "zoom_lent_avant"):
            k = (1 - 0.3 * ease(u)) if name == "zoom_lent_avant" else (1.0 - 0.06 * u)
            z = (1.0 * sz + 0.3) * k
            back = (0.75 * sz + 0.3) * k if name == "plongee" else (0.35 * sz + 0.05) * k
            loc = (H[0] + 0.02, H[1] - back, H[2] + z)
            return loc, H, (36 if sz < 1.0 else 22), 0.0
        d = _rot(f, 10 * D2R)
        return _add(H, d, 2.2 * sz + 0.8, 1.4 * sz + 0.6), H, 32, -0.02
    if name == "gros_plan_objet":
        d = _rot(f, (8 - 6 * u) * D2R)
        return _add(H, d, 2.0 * sz + 0.5 - 0.1 * u, 0.06), H, 45, -0.05
    if name == "zoom_lent_avant":
        d = _rot(f, 6 * D2R)
        return _add(H, d, (2.6 - 1.2 * ease(u)) * sz + 0.4, 0.1), H, 40, -0.05
    if name == "plongee":
        d = _rot(f, 15 * D2R)
        return _add(H, d, 1.8 * sz + 0.6, 1.6 * sz + 0.4), H, 32, -0.03
    if name == "contre_plongee":
        return _add((H[0], H[1], max(0.25, H[2] - 0.8)), f, 1.6 * sz + 0.6, 0.0), H, 26, 0.0
    if name == "orbite_lente":
        d = _rot(f, (-25 + 50 * u) * D2R)
        return _add(H, d, 1.8 * sz + 0.6, 0.25), H, 36, -0.05
    if name == "panoramique":
        side = (-f[1], f[0])
        loc = _add(H, f, 3.0 * sz + 1.5, 0.3)
        a = ease(u)
        return loc, (H[0] + side[0] * 2.5 * (1 - a), H[1] + side[1] * 2.5 * (1 - a), H[2]), 30, -0.04
    if name == "travelling_suivi":
        d = _rot(f, (35 - 25 * u) * D2R)
        return _add(H, d, 2.2 * sz + 0.8, 0.2), H, 32, -0.04
    # plan_large par défaut
    d = _rot(f, 15 * D2R)
    return _add(H, d, 3.2 * sz + 2.5, 0.8), H, 26, -0.04


def resolve_collisions(loc, actors_xy, world, subject_xy=None):
    """Écarte la caméra des personnages (rayon 0,4 m) et la garde dans la pièce."""
    x, y, z = loc
    for (ax, ay, h) in actors_xy:
        d = math.hypot(x - ax, y - ay)
        if d < 0.4 and z < h + 0.1:
            if d < 1e-3:
                x, y = ax, ay - 0.4
            else:
                x, y = ax + (x - ax) * 0.4 / d, ay + (y - ay) * 0.4 / d
    return world.clamp_camera((x, y, z))
