"""Conventions : angles positifs = pencher EN AVANT (lean), lever la tête
(head_pitch), lever le bras vers l'avant (arms[0]).

Actions des personnages : calcul procédural de la pose à chaque instant.

Aucune dépendance à Blender : on calcule des nombres (position, orientation,
angles des articulations), appliqués ensuite par characters.apply_pose().

Actions : marcher, passer (à côté sans voir), attendre, parler, s_asseoir,
assis, se_lever, regarder, sursauter, frissonner, serrer (dans ses bras),
toucher (poser la main sur l'épaule), poser (mettre la table…).
Enchaînement possible : "puis": {"action": "marcher", "vers": [x, y]}.
"""
import math
import random
import zlib


def shash(s):
    """Empreinte stable (hash() de Python change à chaque lancement)."""
    return zlib.crc32(str(s).encode())

from .scenario import parse_time

D2R = math.pi / 180


def smooth(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)


def yaw_towards(x0, y0, x1, y1):
    """Orientation pour regarder de (x0,y0) vers (x1,y1) (0 = face à -Y)."""
    return math.atan2(x1 - x0, -(y1 - y0))


def wrap(a):
    return (a + math.pi) % (2 * math.pi) - math.pi


class Actor:
    def __init__(self, spec, defn, dims, world, duree):
        """spec : entrée du scénario ; dims : tailles du rig ; world : décor
        (ancres, sièges) ; duree : durée du plan (s)."""
        self.spec, self.defn, self.dims, self.world, self.duree = spec, defn, dims, world, duree
        self.name = spec["qui"]
        self.rng = random.Random(shash(self.name) & 0xFFFF)
        self.phase = self.rng.random() * 10
        self.speed = 1.0 if dims["H"] < 1.6 else 1.15
        self._plan_segments()

    # ------------------------------------------------------------------ helpers
    def resolve(self, v, default=None):
        """[x, y] ou nom d'ancre du décor → (x, y)."""
        if v is None:
            return default
        if isinstance(v, str):
            a = self.world.anchor(v)
            return (a[0], a[1]) if a else default
        return (float(v[0]), float(v[1]))

    def _plan_segments(self):
        """Découpe l'action principale (+ « puis ») en segments temporels."""
        s = self.spec
        pos = self.resolve(s.get("position"), (0.0, 1.5))
        self.seat = None
        segs = []
        t = parse_time(s.get("debut_action"), self.duree, 0.0)
        chain = [s]
        nxt = s.get("puis")
        while nxt:
            chain.append(nxt)
            nxt = nxt.get("puis")
        cur = pos
        # Pré-état : assis si on doit se lever, ou si on est assis
        first = s["action"]
        if first in ("assis", "se_lever", "frissonner", "toucher") and (s.get("objet") or first in ("assis", "se_lever")):
            if first != "toucher":
                self.seat = self.world.nearest_seat(cur, s.get("objet"))
                if self.seat:
                    cur = (self.seat["x"], self.seat["y"])
        # dormir : hauteur du support (ancre du décor : canapé, lustre, baignoire, frigo…)
        self.support_z = float(s.get("hauteur", 0.0))
        if isinstance(s.get("position"), str) and self.world.anchor(s["position"]):
            an = self.world.anchor(s["position"])
            self.support_z = float(s.get("hauteur", an[2]))
            self.support_yaw = an[3] if isinstance(an[3], (int, float)) else 0.0
        else:
            self.support_yaw = 0.0
        if first == "dormir" and s.get("pose", "allonge") in ("assis", "recroqueville"):
            self.seat = {"x": cur[0], "y": cur[1], "h": max(0.2, self.support_z), "yaw": self.support_yaw, "type": "dodo"}
        elif first == "dormir":
            # allongé : la position donnée est le MILIEU du corps → on recule les pieds
            o = s.get("orientation")
            yw = o * D2R if isinstance(o, (int, float)) else self.support_yaw
            half = self.dims["H"] / 2
            cur = (cur[0] + math.sin(yw) * half, cur[1] - math.cos(yw) * half)
        self.start = cur
        for k, a in enumerate(chain):
            act = a["action"]
            seg = {"action": act, "t0": t, "spec": a, "from": cur}
            if act in ("marcher", "passer", "rouler", "courir"):
                to = self.resolve(a.get("vers"))
                if to is None:
                    yaw = self._orientation_static(a, cur)
                    to = (cur[0] + 4 * math.sin(yaw), cur[1] - 4 * math.cos(yaw))
                dist = math.hypot(to[0] - cur[0], to[1] - cur[1])
                spd = self.speed * (2.0 if act == "rouler" else 2.3 if act == "courir" else 1.0) * (0.7 if a.get("objet") == "canape_dos" else 1.0)
                dur = max(0.4, dist / spd)
                seg["speed"] = spd
                if act == "passer" and k == 0 and "vers" in a:
                    dur = max(dur, self.duree - t)    # traverse tout le plan
                    seg["speed"] = dist / dur
                seg.update(t1=t + dur, to=to)
                cur = to
            elif act == "se_lever":
                seg["t1"] = t + 1.0
                seg["to"] = cur if not self.seat else (self.seat["x"] - 0.45 * math.sin(self.seat["yaw"]),
                                                        self.seat["y"] + 0.45 * math.cos(self.seat["yaw"]))
                cur = seg["to"]
            elif act == "s_asseoir":
                self.seat = self.world.nearest_seat(cur, a.get("objet"))
                seg["t1"] = t + 1.0
                seg["to"] = (self.seat["x"], self.seat["y"]) if self.seat else cur
                cur = seg["to"]
            elif act == "sursauter":
                seg["t1"] = t + 0.9
                seg["to"] = cur
            else:
                seg["t1"] = 1e9
                seg["to"] = cur
            segs.append(seg)
            t = seg["t1"]
            if t > 1e8:
                break
        self.segs = segs

    def _target_pos(self, name, t, others):
        if name is None:
            return None
        if name in others:
            return others[name].pos(t)
        a = self.world.anchor(name)
        return (a[0], a[1]) if a else None

    def _orientation_static(self, a, cur, others=None, t=0.0):
        o = a.get("orientation")
        if isinstance(o, (int, float)):
            return o * D2R
        tgt = o if isinstance(o, str) and o != "camera" else None
        if tgt is None and a["action"] in ("regarder", "toucher", "serrer", "pousser", "frapper"):
            tgt = a.get("cible")
        if tgt:
            if others and tgt in others:
                p = others[tgt].pos(t)
            else:
                p = self._target_pos(tgt, t, others or {})
            if p:
                return yaw_towards(cur[0], cur[1], p[0], p[1])
        if self.seat:
            return self.seat["yaw"]
        return 0.0

    def _segment(self, t):
        cur = self.segs[0]
        if t < cur["t0"]:
            return None, 0.0
        for s in self.segs:
            if s["t0"] <= t:
                cur = s
        return cur, t - cur["t0"]

    # --------------------------------------------------------------- position
    def pos(self, t):
        seg, lt = self._segment(t)
        if seg is None:
            return self.start
        if seg["action"] in ("marcher", "passer", "rouler", "courir"):
            dur = seg["t1"] - seg["t0"]
            u = min(1.0, lt / dur) if dur > 0 else 1.0
            a, b = seg["from"], seg["to"]
            return (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)
        if seg["action"] in ("se_lever", "s_asseoir"):
            u = smooth(lt / 1.0)
            a, b = seg["from"], seg["to"]
            return (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)
        return seg["to"]

    # ------------------------------------------------------------------- pose
    def pose(self, t, others):
        d = self.dims
        seg, lt = self._segment(t)
        act = seg["action"] if seg else ("assis" if self.seat else "attendre")
        a = seg["spec"] if seg else self.spec
        x, y = self.pos(t)
        ph = self.phase + t
        p = {"x": x, "y": y, "dz": 0.0, "lean": 0.0, "roll": 0.0, "twist": 0.0,
             "head_pitch": 0.0, "head_yaw": 0.0, "head_roll": 0.0,
             "arms": [[0.0, 0.06, 0.0], [0.0, 0.06, 0.0]], "legs": [0.0, 0.0], "bouche": 0.0}
        # respiration / balancement d'attente
        p["dz"] = 0.006 * math.sin(ph * 2.2)
        p["arms"][0][0] = 0.04 * math.sin(ph * 1.3)
        p["arms"][1][0] = 0.04 * math.sin(ph * 1.3 + 1)
        yaw = self._orientation_static(a, (x, y), others, t)
        sit = 1.0 if (self.seat and act in ("assis", "frissonner", "attendre", "parler", "regarder")) else 0.0

        moving = act in ("marcher", "passer", "rouler", "courir") and seg
        if moving and lt >= (seg["t1"] - seg["t0"]) and a.get("orientation") is None:
            fx, fy = seg["to"][0] - seg["from"][0], seg["to"][1] - seg["from"][1]
            if abs(fx) + abs(fy) > 1e-3:
                yaw = math.atan2(fx, -fy)        # arrivé : garde la direction de la marche
        if act == "rouler" and seg and lt < (seg["t1"] - seg["t0"]):
            fx, fy = seg["to"][0] - seg["from"][0], seg["to"][1] - seg["from"][1]
            yaw = math.atan2(fx, -fy)
            p["legs"] = [0.12, -0.05]           # un pied sur la trottinette
            p["arms"] = [[1.0, 0.0, 0.35], [1.0, 0.0, 0.35]]   # mains sur le guidon
            p["lean"] = 0.12
            p["dz"] = 0.12 + 0.01 * math.sin(ph * 9)            # monté sur la planche
            p["head_pitch"] = 0.05
        elif act == "courir" and seg and lt < (seg["t1"] - seg["t0"]):
            fx, fy = seg["to"][0] - seg["from"][0], seg["to"][1] - seg["from"][1]
            yaw = math.atan2(fx, -fy)
            w = 2 * math.pi * 2.6
            s = math.sin(lt * w)
            p["legs"] = [0.95 * s, -0.95 * s]
            p["arms"][0] = [-1.0 * s + 0.3, 0.1, 0.0]
            p["arms"][1] = [1.0 * s + 0.3, 0.1, 0.0]
            p["dz"] = 0.07 * abs(math.cos(lt * w))
            p["lean"] = 0.28
        elif act in ("marcher", "passer") and seg and lt < (seg["t1"] - seg["t0"]):
            fx, fy = seg["to"][0] - seg["from"][0], seg["to"][1] - seg["from"][1]
            yaw = math.atan2(fx, -fy)
            spd = seg.get("speed", self.speed)
            w = 2 * math.pi * spd / (0.9 * d["leg"] / 0.6)
            s = math.sin(lt * w)
            p["legs"] = [0.5 * s, -0.5 * s]
            p["arms"][0][0] = -0.45 * s
            p["arms"][1][0] = 0.45 * s
            p["dz"] = 0.03 * abs(math.cos(lt * w))
            p["lean"] = 0.06
        elif act == "dormir":
            pose = a.get("pose", "allonge")
            br = 0.5 + 0.5 * math.sin(ph * 1.6)      # respiration lente
            if pose in ("assis", "recroqueville"):
                sit = 1.0
                p["lean"] = 0.35 if pose == "recroqueville" else 0.1
                p["arms"] = [[0.9, 0.0, 0.7], [0.9, 0.0, 0.7]] if pose == "recroqueville" else [[0.3, 0.1, 0.2], [0.3, 0.1, 0.2]]
                p["head_pitch"] = -0.35
                p["head_roll"] = 0.25 + 0.04 * br
            else:
                # allongé sur le dos (le corps part des pieds vers la tête)
                p["root_pitch"] = -math.pi / 2
                p["root_z"] = self.support_z + d.get("td", 0.28) / 2 + 0.02
                p["dz"] = 0.006 * br
                p["head_roll"] = 0.35
                if pose == "suspendu":     # bras et jambes qui pendent dans le vide
                    p["arms"] = [[-1.3, 0.2, 0.0], [-1.2, 0.2, 0.0]]
                    p["legs"] = [-0.9, -0.7]
                else:
                    p["arms"] = [[0.1, 0.25, 0.0], [0.1, 0.25, 0.0]]
                yaw = a.get("orientation", self.support_yaw * 180 / math.pi) * D2R if isinstance(a.get("orientation"), (int, float)) else self.support_yaw
        elif act == "filmer":
            # téléphone tenu devant soi (main droite), petit balancement d'influenceur
            p["arms"][1] = [1.45 + 0.05 * math.sin(ph * 2.0), -0.15, 0.35]
            p["arms"][0] = [0.35 + 0.2 * math.sin(ph * 2.7), 0.25, 0.0]
            p["head_pitch"] = 0.05 * math.sin(ph * 3.3)
            p["head_roll"] = 0.06 * math.sin(ph * 1.9)
            p["bouche"] = 1.0
        elif act == "frapper":
            k = (lt * 2.5) % 1.0
            knock = 0.18 * math.sin(k * math.pi * 6) if k < 0.5 else 0.0
            p["arms"][1] = [1.55 + knock, 0.0, 0.1]
            p["lean"] = 0.05
        elif act == "pousser":
            sh = 0.08 * math.sin(ph * 6)
            p["arms"] = [[1.45 + sh, 0.0, 0.15], [1.45 - sh, 0.0, 0.15]]
            p["lean"] = 0.25
        elif act == "se_lever":
            sit = 1 - smooth(lt / 0.9)
            p["lean"] = 0.35 * math.sin(math.pi * min(1, lt / 0.9))
            if self.seat:
                yaw = self.seat["yaw"]
        elif act == "s_asseoir":
            sit = smooth((lt - 0.3) / 0.7)
            p["lean"] = 0.3 * math.sin(math.pi * min(1, lt / 1.0))
            if self.seat:
                yaw = self.seat["yaw"]
        elif act == "assis":
            sit = 1.0
        elif act == "parler":
            p["head_pitch"] = 0.10 * math.sin(ph * 5.1) * (0.6 + 0.4 * math.sin(ph * 1.7))
            p["head_roll"] = 0.05 * math.sin(ph * 2.3)
            p["arms"][1] = [0.55 + 0.25 * math.sin(ph * 3.1), 0.15, 0.25]
            p["bouche"] = 1.0
        elif act == "sursauter":
            k = lt
            if k < 0.25:
                p["dz"] += 0.18 * math.sin(math.pi * k / 0.25)
            up = smooth(k / 0.15)
            p["arms"] = [[1.9 * up, 0.35, 0.0], [1.9 * up, 0.35, 0.0]]
            p["lean"] = -0.15 * up
        elif act == "frissonner":
            u = smooth(lt / 0.3)
            p["roll"] = 0.05 * u * math.sin(lt * 55) * math.exp(-max(0, lt - 1.2) * 1.2)
            p["arms"] = [[1.1 * u, 0.0, 0.75 * u], [1.1 * u, 0.0, 0.75 * u]]
            p["head_pitch"] = -0.15 * u        # tête rentrée
        elif act == "serrer":
            pitch = 1.35
            c = a.get("cible")
            if c in others:          # on enlace plus bas quelqu'un de plus petit
                pitch += max(-0.7, min(0.0, (others[c].dims["H"] - d["H"]) * 1.6))
            p["arms"] = [[pitch, 0.0, 0.55], [pitch, 0.0, 0.55]]
            p["lean"] = 0.12
            p["roll"] = 0.03 * math.sin(ph * 1.2)
        elif act == "toucher":
            p["arms"][0] = [1.45, -0.1, 0.25]       # bras gauche tendu vers l'épaule
        elif act == "poser":
            c = (math.sin(ph * 2.2) + 1) / 2
            p["arms"] = [[0.9 + 0.4 * c, 0.0, 0.3], [0.9 + 0.4 * c, 0.0, 0.3]]
            p["lean"] = 0.12 + 0.12 * c
            p["head_pitch"] = -0.35
        # porter un canapé sur le dos : bras levés derrière la tête
        if a.get("objet") == "canape_dos" and act in ("marcher", "attendre", "passer"):
            p["arms"] = [[2.7, 0.1, 0.0], [2.7, 0.1, 0.0]]
            p["lean"] = 0.28
            p["head_pitch"] = 0.15
        # après un sursaut : on reste figé, bras mi-levés, qui tremblent
        if seg and act == "sursauter" and lt > 0.9:
            tr = 0.03 * math.sin(lt * 40)
            p["arms"] = [[1.4 + tr, 0.3, 0.5], [1.4 - tr, 0.3, 0.5]]
            p["lean"] = -0.08
            p["dz"] = 0.0
        # assis : jambes à l'horizontale, bassin à hauteur du siège
        if sit > 0:
            seat_h = self.seat["h"] if self.seat else 0.45
            p["legs"] = [1.5 * sit, 1.5 * sit]
            p["dz"] += (seat_h + 0.04 - d["leg"]) * sit
            if self.seat:
                p["dy_hips"] = 0.0
                yaw = self.seat["yaw"] if act != "se_lever" else yaw
            if self.seat and self.seat.get("type") == "pupitre" and act == "assis":
                p["arms"] = [[1.2, 0.0, 0.25], [1.2, 0.0, 0.25]]
        p["yaw"] = yaw
        # --- regard (tête) ---
        look = a.get("regarde")
        if look is None and act in ("regarder", "toucher", "serrer"):
            look = a.get("cible")
        if act in ("passer", "dormir") or (act == "courir" and look != "camera"):
            look = None if act != "courir" else look
        if look:
            if look == "camera":
                hy = wrap(0.0 - yaw)
                p["head_yaw"] = max(-1.1, min(1.1, hy))
            elif look == "loin":
                p["head_yaw"] = 0.45
                p["head_pitch"] += 0.06
            else:
                tp = self._target_pos(look, t, others)
                if tp:
                    hy = wrap(yaw_towards(x, y, tp[0], tp[1]) - yaw)
                    p["head_yaw"] = max(-1.1, min(1.1, hy))
                    if look in others:
                        dh = others[look].dims["H"] - d["H"]
                        dist = max(0.3, math.hypot(tp[0] - x, tp[1] - y))
                        p["head_pitch"] += math.atan2(dh, dist) * 0.8
                    elif self.world.anchor(look):
                        az = self.world.anchor(look)[2]
                        dist = max(0.3, math.hypot(tp[0] - x, tp[1] - y))
                        p["head_pitch"] += math.atan2(az - d["H"] * 0.9, dist) * 0.8
        p["sit"] = sit
        return p


def head_world(p, rig):
    """Position (x, y, z) du centre de la tête pour une pose (debout, assis ou allongé)."""
    up = rig.leg + rig.torso + 0.02 + rig.hs / 2
    if abs(p.get("root_pitch", 0.0)) > 0.5:
        yaw = p["yaw"]
        L = up + p.get("dz", 0.0)
        return (p["x"] - math.sin(yaw) * L, p["y"] + math.cos(yaw) * L, p.get("root_z", 0.0))
    return (p["x"], p["y"], rig.leg + p.get("dz", 0.0) + rig.torso + 0.02 + rig.hs / 2)


def body_world(p, rig):
    if abs(p.get("root_pitch", 0.0)) > 0.5:
        yaw = p["yaw"]
        L = rig.leg
        return (p["x"] - math.sin(yaw) * L, p["y"] + math.cos(yaw) * L, p.get("root_z", 0.0))
    return (p["x"], p["y"], rig.leg * 0.9 + p.get("dz", 0.0) + rig.torso * 0.3)
