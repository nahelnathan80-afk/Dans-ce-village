"""Rendu d'UN plan dans Blender (lancé dans un processus séparé par build.py).

  python -m dcv.render_shot <job.json>

job.json contient : le plan (scénario), sa « spec » de timing (cadrages,
bulles…), le mode (apercu/final), le nombre d'images et les dossiers.
Étapes :
  1. construit le décor, les personnages, la foule, la caméra ;
  2. écrit les textures animées (visages, compteurs qui glitchent, photo) ;
  3. calcule la pose de chaque personnage et la caméra à chaque image
     (appliquées par un « handler » de changement d'image) ;
  4. enregistre meta.json : position à l'écran des têtes et compteurs
     (pour placer bulles et étiquettes au montage) ;
  5. rend les images PNG (les images déjà présentes sont sautées → reprise).
"""
import json
import math
import random
import sys
import time
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

from . import actions as A
from . import camera as C
from . import characters as CH
from . import crowd as CR
from . import moods as MO
from . import scene as S
from . import sets as SETS
from . import textures as T
from .faces import draw_face
from .actions import shash


INTERIEURS = {"chambre_ado", "chambre_cartons", "cuisine", "salle_classe", "villa_interieur", "chambre_amis"}


def log(*a):
    print("   [blender]", *a, flush=True)


# ---------------------------------------------------------------------------
def setup_render(scene, job):
    mode = job["mode"]
    W, H = mode["res"]
    r = scene.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = W, H, 100
    r.fps = job["fps"]
    scene.frame_start = 1
    scene.frame_end = job["n_frames"]
    scene.frame_step = mode["step"]
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGB"
    r.image_settings.compression = 15
    r.use_overwrite = False          # reprise : on ne refait pas les images existantes
    r.use_placeholder = True
    r.filepath = str(Path(job["frames_dir"]) / "f_####")
    if mode["engine"] == "CYCLES":
        r.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = mode["samples"]
        scene.cycles.use_denoising = True
    else:
        r.engine = "BLENDER_EEVEE"
        e = scene.eevee
        e.taa_render_samples = mode["samples"]
        for attr, val in (("use_raytracing", False), ("use_shadows", mode.get("shadows", True)),
                          ("shadow_resolution_scale", mode.get("shadow_scale", 0.5)),
                          ("shadow_ray_count", 1), ("shadow_step_count", 4)):
            if hasattr(e, attr):
                try:
                    setattr(e, attr, val)
                except Exception:
                    pass
    vs = scene.view_settings
    try:
        vs.view_transform = "Standard"     # couleurs franches, style jouet
        vs.look = "None"
    except TypeError:
        pass
    vs.exposure = 0.0   # ajusté par l'ambiance (moods.apply)


def _carried_object(rig, objet, name):
    """Objets tenus/portés : trottinette sous les pieds, canapé sur le dos."""
    if objet == "trottinette":
        e = S.empty(f"{name}_trott", (0, 0, 0), rig.root)
        S.box(f"{name}_planche", (0.16, 0.7, 0.05), (0, 0.05, 0.06), "#ff3d7f", parent=e, origin="bottom", bevel=0.01)
        S.box(f"{name}_guidon_tige", (0.04, 0.04, 0.95), (0, -0.28, 0.08), "#c0c0c8", parent=e, origin="bottom", bevel=0)
        S.box(f"{name}_guidon", (0.45, 0.04, 0.04), (0, -0.28, 1.02), "#222222", parent=e, origin="bottom", bevel=0.01)
        for yy in (-0.28, 0.36):
            S.cylinder(f"{name}_roue", 0.06, 0.05, (0, yy, 0.0), "#222222", parent=e, verts=12).rotation_euler = (0, 1.5708, 0)
    elif objet == "doudou":
        # petit ours cubique tenu dans la main droite
        e = S.empty(f"{name}_doudou", (0, -0.12, -rig.arm - 0.05), rig.arms[1])
        S.box(f"{name}_dd_corps", (0.16, 0.12, 0.18), (0, 0, -0.1), "#c68b59", parent=e, origin="bottom", bevel=0.04)
        S.box(f"{name}_dd_tete", (0.14, 0.12, 0.12), (0, 0, 0.08), "#c68b59", parent=e, origin="bottom", bevel=0.04)
        for sx in (-0.06, 0.06):
            S.box(f"{name}_dd_oreille", (0.05, 0.04, 0.05), (sx, 0, 0.19), "#8d5a3b", parent=e, origin="bottom", bevel=0.015)
    elif objet == "canape_dos":
        e = S.empty(f"{name}_canape", (0, rig.td / 2 + 0.25, rig.torso + 0.25), rig.hips)
        e.rotation_euler = (-0.35, 0, 0)
        S.box(f"{name}_can_assise", (1.6, 0.7, 0.35), (0, 0, 0), "#8e6c4a", parent=e, origin="bottom", bevel=0.05)
        S.box(f"{name}_can_dos", (1.6, 0.2, 0.55), (0, 0.3, 0.3), "#7a5a3c", parent=e, origin="bottom", bevel=0.05)
        for sx in (-0.75, 0.75):
            S.box(f"{name}_can_acc", (0.18, 0.7, 0.45), (sx, 0, 0.2), "#7a5a3c", parent=e, origin="bottom", bevel=0.05)


def _near_segment(p, a, b, r):
    """Le point p (x, y) est-il à moins de r du segment a→b (vu de dessus),
    hors des 30 premiers centimètres côté sujet ?"""
    ax, ay, bx, by = a[0], a[1], b[0], b[1]
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    if L2 < 1e-6:
        return False
    u = ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2
    if u < 0 or u > 1 - 0.1 / math.sqrt(L2):
        return False
    qx, qy = ax + u * dx, ay + u * dy
    return math.hypot(p[0] - qx, p[1] - qy) < r


def _ghostify(mat):
    """Insère un nœud « opacite » (multiplication) devant l'entrée Alpha,
    pour pouvoir rendre le personnage progressivement transparent."""
    nt = mat.node_tree
    if "opacite" in nt.nodes:
        return
    b = nt.nodes["Principled BSDF"]
    mul = nt.nodes.new("ShaderNodeMath")
    mul.name = "opacite"
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 1.0
    if b.inputs["Alpha"].is_linked:
        src = b.inputs["Alpha"].links[0].from_socket
        nt.links.new(src, mul.inputs[0])
    else:
        mul.inputs[0].default_value = 1.0
    nt.links.new(mul.outputs[0], b.inputs["Alpha"])


# ---------------------------------------------------------------------------
class Shot:
    def __init__(self, job):
        self.job = job
        self.plan = job["plan"]
        self.spec = job["spec"]
        self.fps = job["fps"]
        self.N = job["n_frames"]
        self.duree = self.spec["duree"]
        self.tex = Path(job["work_dir"]) / "tex"
        self.tex.mkdir(parents=True, exist_ok=True)
        self.rng = random.Random(shash(self.plan["id"]) & 0xFFFF)

    def t_of(self, f):
        return (f - 1) / self.fps

    # ------------------------------------------------------------------ build
    def build(self):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        S.reset_caches()
        sc = bpy.context.scene
        self.scene = sc
        setup_render(sc, self.job)
        self.mood = MO.get(self.plan["mood"])
        cam_d = bpy.data.cameras.new("cam")
        cam_d.sensor_fit = "VERTICAL"
        cam_d.sensor_height = 36
        cam_d.clip_start = 0.05
        cam_d.clip_end = 200
        self.cam = bpy.data.objects.new("cam", cam_d)
        sc.collection.objects.link(self.cam)
        sc.camera = self.cam

        ctx = {"tex_dir": self.tex, "textes_decor": self.plan.get("textes_decor", []),
               "accessoires": self.plan.get("accessoires"), "lampes": self.mood.get("lamps", 0.0),
               "ciel_fenetre": self.mood.get("window"), "fenetre_emit": 1.4,
               "villa": self.plan.get("villa"), "nuit": self.mood.get("lamps", 0) > 2,
               "guirlandes": self.mood.get("guirlandes", False), "duree": self.duree,
               "rue": self.plan.get("rue"), "maison": self.plan.get("maison")}
        autel = self.plan.get("autel")
        if autel:
            ctx["photo_mat"] = self._photo_material(autel)
        self.world = SETS.build(self.plan["decor"], ctx)
        MO.apply(sc, self.mood)
        if self.plan["decor"] in INTERIEURS and not self.mood.get("interior"):
            # ambiance d'extérieur utilisée dans un intérieur : on ajoute un plafonnier
            import bpy as _b
            ld = _b.data.lights.new("plafonnier_auto", "AREA")
            ld.energy, ld.size, ld.use_shadow = 70, 5.0, False
            sc.view_settings.exposure -= 0.25
            ld.color = self.mood["fill"]
            lo = _b.data.objects.new("plafonnier_auto", ld)
            sc.collection.objects.link(lo)
            lo.location = (0, 2.8, 3.0)

        # [ep06] lumière qui s'allume d'un coup : « lumiere »: {"allume": "40%"}
        lum = self.plan.get("lumiere")
        if lum and lum.get("allume") is not None:
            import bpy as _b
            from .scenario import parse_time
            t_on = parse_time(lum["allume"], self.duree, 0.0)
            ld = _b.data.lights.new("plafonnier_allume", "AREA")
            ld.size, ld.use_shadow, ld.color = 4.0, False, (1.0, 0.95, 0.85)
            lo = _b.data.objects.new("plafonnier_allume", ld)
            sc.collection.objects.link(lo)
            lo.location = (0, 2.5, 2.85)
            e0 = sc.view_settings.exposure
            on_e = float(lum.get("energie", 260))

            def _lumiere(t, ld=ld, sc=sc, e0=e0, t_on=t_on, on_e=on_e):
                on = t >= t_on
                ld.energy = on_e if on else 0.0
                sc.view_settings.exposure = e0 + (0.35 if on else 0.0)
            self.world.animations.append(_lumiere)

        # --- acteurs : principaux + foule
        mains = self.plan["personnages"]
        main_pos = []
        for p in mains:
            pos = p.get("position", [0, 1.5])
            if isinstance(pos, str):
                a = self.world.anchor(pos)
                pos = [a[0], a[1]] if a else [0, 1.5]
            main_pos.append((p["qui"], tuple(pos)))
        foule = CR.generate(self.plan.get("foule"), self.world, main_pos, self.duree + 1,
                            seed=shash(self.plan["id"]) & 0xFFFF)
        self.actors = {}
        self.rigs = {}
        for spec in mains + foule:
            self._add_actor(spec)
        # reflet dans le miroir
        self.reflet = None
        if self.world.mirror:
            near = [n for n, a in self.actors.items() if not a.spec.get("_foule")]
            if near:
                self._add_reflection(near[0])
        self._precompute()

    def _photo_material(self, autel):
        from .scenario import load_character
        d = load_character(autel.get("photo", "leo"))
        eff = next((e for e in autel.get("effets", []) if e.get("type") == "photo_efface"), None)
        if not eff:
            p = self.tex / "photo.png"
            T.photo_image(d).save(p)
            return S.image_material(p, emit=0.05, alpha=False, name="photo")
        seq = T.Sequence(self.tex / "photo_seq", self.N)
        for f in range(1, self.N + 1):
            u = min(1.0, self.t_of(f) / max(0.1, self.duree))
            v = eff.get("de", 0.0) + (eff.get("a", 1.0) - eff.get("de", 0.0)) * u
            q = round(v * 40) / 40
            seq.write(f, q, lambda q=q: T.photo_image(d, q))
        return S.image_material(seq.path(1), emit=0.05, alpha=False, name="photo", sequence_frames=self.N)

    def _counter_material(self, name, texte, style):
        if not texte or style == "cache":
            return None
        if style == "rouge_glitch":
            seq = T.Sequence(self.tex / f"cpt_{name}", self.N)
            base = T.counter_image(texte, "rouge_glitch")
            self._aspect = base.size[0] / base.size[1]
            rng = random.Random(len(texte) + len(name))
            nxt, burst = 0.3, 0
            for f in range(1, self.N + 1):
                t = self.t_of(f)
                if t >= nxt and burst == 0:
                    burst = rng.randint(3, 7)
                    nxt = t + rng.uniform(0.5, 1.3)
                if burst > 0:
                    burst -= 1
                    k = rng.randint(0, 5)
                    seq.write(f, ("g", k), lambda k=k: T.glitch(base, random.Random(k), 1.0 + k * 0.2))
                else:
                    seq.write(f, "clean", lambda: base)
            return S.image_material(seq.path(1), emit=1.0, name=f"cpt_{name}", sequence_frames=self.N)
        key = f"{style}_{texte}"
        p = self.tex / f"cpt_{abs(shash(key))}.png"
        im = T.counter_image(texte, style or "normal")
        self._aspect = im.size[0] / im.size[1]
        if not p.exists():
            im.save(p)
        return S.image_material(p, emit=0.9, name=f"cpt_{name}")

    def _add_actor(self, spec, name=None):
        name = name or spec["qui"]
        d = spec["_def"]
        # dimensions provisoires (pour l'Actor) — identiques à characters.build
        gab = CH.GABARITS.get(d.get("gabarit", "adulte"), CH.GABARITS["adulte"])
        Hh = float(d.get("taille", gab[0]))
        dims = {"H": Hh, "leg": (Hh - gab[1]) * 0.5, "hs": gab[1], "torso": (Hh - gab[1]) * 0.5, "td": gab[3]}
        actor = A.Actor(spec, d, dims, self.world, self.duree)
        self.actors[name] = actor
        crowd = spec.get("_foule", False)
        extras = {a["type"]: a.get("couleur", True) for a in d.get("accessoires", []) if a.get("type") in ("lunettes", "moustache", "taches", "lunettes_soleil")}
        if crowd:
            p = self.tex / f"face_{name}.png"
            draw_face(spec.get("expression", "neutre"), d.get("couleurs", {}), {}, extras).save(p)
            face_mat = S.image_material(p, name=f"face_{name}")
            actor.face_seq = None
        else:
            actor.face_seq = T.Sequence(self.tex / f"face_{name}", self.N)
            draw_face("neutre", d.get("couleurs", {})).save(actor.face_seq.path(1))   # provisoire
            face_mat = S.image_material(actor.face_seq.path(1), name=f"face_{name}", sequence_frames=self.N)
            actor.extras = extras
        self._aspect = 1024 / 300
        cpt = spec.get("compteur")
        if spec.get("compteur_reflet") and not name.startswith("reflet:"):
            cpt = None          # le compteur n'apparaît que dans le miroir
        cmat = self._counter_material(name, cpt, spec.get("compteur_style", "normal"))
        effets = spec.get("effets", [])
        ghost = any(e.get("type") == "transparence" for e in effets) or spec.get("opacite") is not None
        rig = CH.build(d, name, face_mat, cmat, self.cam, unique_mats=ghost, counter_aspect=self._aspect)
        if ghost:
            for m in rig.materials:
                m.surface_render_method = "BLENDED"
                m.use_transparency_overlap = False
                _ghostify(m)
        self.rigs[name] = rig
        _carried_object(rig, spec.get("objet"), name)
        actor.dims.update(H=rig.H, leg=rig.leg, hs=rig.hs, torso=rig.torso)
        return actor

    def _add_reflection(self, name):
        src = self.actors[name]
        spec = dict(src.spec)
        spec["qui"] = f"reflet_{name}"
        spec["etiquette"] = False
        own_face = bool(src.spec.get("expression_reflet"))
        if own_face:                # le reflet a SA propre expression (ex. il sourit… pas l'original)
            spec["expression"] = src.spec["expression_reflet"]
        # le reflet peut jouer SA propre action (ex. reste immobile, frappe la vitre)
        if src.spec.get("position_reflet"):     # le reflet se tient ailleurs (ex. debout alors qu'on dort)
            spec["position"] = src.spec["position_reflet"]
            spec["orientation"] = src.spec.get("orientation_reflet", "miroir")
            spec.setdefault("action_reflet", "attendre")
            src.spec.setdefault("action_reflet", spec["action_reflet"])
            spec.pop("objet", None)
        if src.spec.get("action_reflet"):
            spec["action"] = src.spec["action_reflet"]
            spec.pop("vers", None)
            spec.pop("objet", None) if spec["action"] == "frapper" else None
        actor = self._add_actor(spec, name=f"reflet:{name}")
        self.reflet = (name, f"reflet:{name}")
        if not own_face:
            actor.face_seq = None       # le reflet réutilise la séquence de l'original
            rig = self.rigs[f"reflet:{name}"]
            orig_face = self.rigs[name].face.data.materials[0]
            rig.face.data.materials[0] = orig_face

    # --------------------------------------------------------------- timeline
    def _face_state(self, actor, f, pose):
        t = self.t_of(f)
        spec = actor.spec
        rng = random.Random(f // 3 + shash(actor.name) % 1000)
        # clignement : toutes les ~3 s, 3 images
        period = 3.1 + (shash(actor.name) % 7) * 0.2
        blink = (t + (shash(actor.name) % 13) * 0.21) % period < 0.1
        if spec.get("expression") == "souriant_fige":
            blink = False                     # ne cligne jamais
        bouche = 0.0
        talk = pose.get("bouche", 0)
        bulles = [b for b in self.spec["bulles"] if b["qui"] == spec["qui"]]
        if bulles:
            talk = 1.0 if any(b["t0"] <= t <= b["t0"] + min(2.2, b["t1"] - b["t0"]) for b in bulles) else 0.0
        if talk:
            bouche = round(abs(math.sin(t * 13.0 + math.sin(t * 5.3))) * 1.0, 1)
        hy = pose.get("head_yaw", 0)
        regard = (round(max(-1, min(1, -hy * 0.0)), 1), 0.0)
        if spec.get("regarde") == "camera":
            regard = (0.0, 0.0)
        expr = spec.get("expression", "neutre")
        tq = round(t * 6) / 6 if expr in ("pleure", "peur", "choque") else 0
        return expr, {"blink": blink, "bouche": bouche, "regard": regard, "t": tq}

    def _precompute(self):
        N = self.N
        names = list(self.actors.keys())
        self.poses = {n: [] for n in names}
        others = {n: a for n, a in self.actors.items() if not n.startswith("reflet:")}
        for f in range(1, N + 1):
            t = self.t_of(f)
            for n in names:
                if n.startswith("reflet:"):
                    continue
                self.poses[n].append(self.actors[n].pose(t, others))
        if self.reflet:
            orig, rn = self.reflet
            my = self.world.mirror["y"]
            out = []
            if self.actors[orig].spec.get("action_reflet"):
                base = [self.actors[rn].pose(self.t_of(f), others) for f in range(1, N + 1)]
            else:
                base = self.poses[orig]
            # reflet en retard : il rejoue les gestes avec X secondes de décalage
            lag = int(round(float(self.actors[orig].spec.get("reflet_retard", 0.0)) * self.fps))
            if lag > 0:
                base = [base[max(0, i - lag)] for i in range(len(base))]
            for p in base:
                q = dict(p)
                q["y"] = 2 * my - p["y"]
                q["yaw"] = math.pi - p["yaw"]
                q["head_yaw"] = -p["head_yaw"]
                q["roll"] = -p.get("roll", 0)
                q["head_roll"] = -p.get("head_roll", 0)
                q["twist"] = -p.get("twist", 0)
                q["arms"] = [p["arms"][1], p["arms"][0]]
                q["legs"] = [p["legs"][1], p["legs"][0]]
                out.append(q)
            self.poses[rn] = out
        # visages (séquences d'images)
        for n, a in self.actors.items():
            if a.face_seq is None:
                continue
            col = a.defn.get("couleurs", {})
            ex = getattr(a, "extras", {})
            for f in range(1, N + 1):
                expr, st = self._face_state(a, f, self.poses[n][f - 1])
                key = (expr, st["blink"], st["bouche"], st["regard"], st["t"])
                a.face_seq.write(f, key, lambda expr=expr, st=st: draw_face(expr, col, st, ex))
        # opacité (effet « disparaît »)
        self.alpha = {}
        for n, a in self.actors.items():
            spec = a.spec
            eff = next((e for e in spec.get("effets", []) if e.get("type") == "transparence"), None)
            base = spec.get("opacite")
            if eff is None and base is None:
                continue
            vals = []
            for f in range(1, N + 1):
                u = min(1.0, self.t_of(f) / max(0.1, self.duree))
                v = 1.0 if base is None else float(base)
                if eff:
                    tr = eff.get("de", 0.0) + (eff.get("a", 0.5) - eff.get("de", 0.0)) * A.smooth(u)
                    v *= 1.0 - tr
                # léger scintillement quand il s'efface
                if eff and u > 0.3:
                    v *= 1.0 - 0.06 * (0.5 + 0.5 * math.sin(self.t_of(f) * 17))
                vals.append(v)
            self.alpha[n] = vals
        # sujets caméra + caméra
        self._camera_track()

    def _subject(self, cible):
        """Construit un camera.Subject à partir d'un nom de cible."""
        if cible.startswith("compteur:"):
            n = cible.split(":", 1)[1]
            if n == "reflet" or n.startswith("reflet:"):
                n = "reflet:" + n.split(":", 1)[1] if ":" in n else n
            if n.startswith("reflet:") and n not in self.poses:
                n = n.split(":", 1)[1]
            if n in self.poses:
                rig, P = self.rigs[n], self.poses[n]
                fi = lambda t: P[min(len(P) - 1, int(t * self.fps))]
                head = lambda t: (fi(t)["x"], fi(t)["y"], rig.counter_z + fi(t)["dz"] - 0.05)
                cw = rig.counter.dimensions.x if rig.counter is not None else 0.66
                return C.Subject("compteur", head, head, lambda t: fi(t)["yaw"], cw)
        n = cible
        if n.startswith("reflet:") and n not in self.poses:
            n = n.split(":", 1)[1]
        if n in self.poses:
            rig, P = self.rigs[n], self.poses[n]
            fi = lambda t: P[min(len(P) - 1, int(t * self.fps))]

            def head(t, rig=rig):
                return A.head_world(fi(t), rig)

            def body(t, rig=rig):
                return A.body_world(fi(t), rig)
            if abs(P[0].get("root_pitch", 0.0)) > 0.5:     # allongé : vu de dessus, visage vers le ciel
                return C.Subject("objet", head, head, lambda t: "haut", 0.9)
            return C.Subject("perso", head, body, lambda t: fi(t)["yaw"], 1.0)
        a = self.world.anchor(cible)
        if cible in ("rue", "piece", "foule", "compteur_haut") or a is None:
            if a is None:
                log(f"cible « {cible} » inconnue → vue d'ensemble")
            ov = self.world.overview
            return C.Subject("decor", lambda t: ov[1], lambda t: ov[1], lambda t: 0.0, 10)
        pt = (a[0], a[1], a[2])
        return C.Subject("objet", lambda t: pt, lambda t: pt, lambda t, y=a[3]: y, a[4])

    def _camera_track(self):
        self.cam_track = []
        self.hidden_counter = []
        segs = self.spec["cadrages"]
        cuts = []
        for f in range(1, self.N + 1):
            t = self.t_of(f)
            seg = segs[-1]
            for s in segs:
                if s["t0"] <= t < s["t1"]:
                    seg = s
                    break
            L = max(0.1, seg["t1"] - seg["t0"])
            u = min(1.2, (t - seg["t0"]) / L)
            cible = seg["cible"]
            pair = None
            if ">" in cible:
                a, b = cible.split(">", 1)
                subj = self._subject(a)
                pair = self._subject(b)
            else:
                subj = self._subject(cible)
            if seg.get("angle"):
                yaw0, ang = subj.yaw, math.radians(seg["angle"])
                subj = C.Subject(subj.kind, subj.head, subj.body,
                                 (lambda t, y0=yaw0, a=ang: y0(t) if y0(t) == "haut" else y0(t) + a), subj.size)
            loc, tgt, lens, shift = C.preset(seg["camera"], subj, u, t, self.world, pair)
            act = [(p[f - 1]["x"], p[f - 1]["y"], self.rigs[n].H) for n, p in self.poses.items()
                   if not n.startswith("reflet:") and n != cible and not cible.startswith(n + ">")]
            loc = C.resolve_collisions(loc, act, self.world)
            # micro-mouvement « caméra à l'épaule » très léger
            loc = (loc[0] + 0.006 * math.sin(t * 1.7), loc[1], loc[2] + 0.005 * math.sin(t * 2.3))
            self.cam_track.append((loc, tgt, lens, shift))
            cuts.append(seg["camera"])
            # par-dessus l'épaule : le compteur de celui qu'on voit de dos est masqué
            fg = cible.split(">", 1)[0] if seg["camera"] == "par_dessus_epaule" else None
            self.hidden_counter.append(fg)
        self.cam_names = cuts
        # figurants qui bouchent la vue sur le sujet : retirés le temps du cadrage
        self.hidden_actors = [set() for _ in range(self.N)]
        bounds = []
        for s in segs:
            f0 = max(1, int(s["t0"] * self.fps) + 1)
            f1 = min(self.N, int(s["t1"] * self.fps) + 1)
            if f0 <= f1:
                bounds.append((f0, f1))
        segs = [s for s in segs if max(1, int(s["t0"] * self.fps) + 1) <= min(self.N, int(s["t1"] * self.fps) + 1)]
        if bounds:
            bounds[-1] = (bounds[-1][0], self.N)
        for (f0, f1), sg in zip(bounds, segs):
            block = set()
            c0 = sg["cible"].split(">")[-1]
            if self._subject(c0).kind == "decor":
                continue            # vue d'ensemble : on garde toute la foule
            for f in range(f0, f1 + 1, 3):
                loc, tgt = self.cam_track[f - 1][0], self.cam_track[f - 1][1]
                for n, a in self.actors.items():
                    if not a.spec.get("_foule"):
                        continue
                    p = self.poses[n][f - 1]
                    if _near_segment((p["x"], p["y"]), loc, tgt, 0.55):
                        block.add(n)
            for f in range(f0, f1 + 1):
                self.hidden_actors[f - 1] = block

    # ---------------------------------------------------------------- frames
    def apply_frame(self, f):
        f = max(1, min(self.N, f))
        hide = self.hidden_actors[f - 1]
        for n, rig in self.rigs.items():
            CH.apply_pose(rig, self.poses[n][f - 1])
            if n in hide:
                rig.root.location.z = -200          # hors champ
            if rig.counter is not None:
                fg = self.hidden_counter[f - 1]
                rig.counter.hide_render = fg is not None and n == fg
            if n in self.alpha:
                v = self.alpha[n][f - 1]
                for m in rig.materials:
                    m.node_tree.nodes["opacite"].inputs[1].default_value = v
        # compteur qui glitche : petit tremblement de position
        for n, rig in self.rigs.items():
            if rig.counter is not None and self.actors[n].spec.get("compteur_style") == "rouge_glitch":
                j = random.Random(f * 31 + len(n)).random()
                rig.counter.location.x = (j - 0.5) * 0.03 if (f // 4) % 5 == 0 else 0.0
        loc, tgt, lens, shift = self.cam_track[f - 1]
        for anim in self.world.animations:
            anim(self.t_of(f))
        if self.world.facade_y is not None:
            vis = loc[1] < self.world.facade_y
            for ob in self.world.facade:
                ob.visible_camera = vis
        self.cam.location = loc
        self.cam.rotation_euler = S.look_at_euler(loc, tgt)
        self.cam.data.lens = lens
        self.cam.data.shift_y = shift

    def write_meta(self):
        """Position à l'écran (0..1, origine en haut à gauche) des têtes et compteurs."""
        sc = self.scene
        meta = {"frames": [], "cameras": self.cam_names}
        for f in range(1, self.N + 1):
            sc.frame_set(f)
            fr = {}
            for n, rig in self.rigs.items():
                sp = self.actors[n].spec
                if (sp.get("_foule") and not sp.get("_zzz")) or n.startswith("reflet:"):
                    continue
                hw = rig.head.matrix_world.translation      # centre de la tête
                top = Vector((hw.x, hw.y, hw.z + rig.hs / 2 + 0.08))
                side = Vector((hw.x, hw.y, hw.z))
                vis_cpt = rig.counter is not None and not rig.counter.hide_render
                ct = Vector((hw.x, hw.y, hw.z + rig.hs / 2 + 0.4)) if vis_cpt else top
                pv = [world_to_camera_view(sc, self.cam, v) for v in (top, ct, side)]
                # échelle : taille à l'écran d'une tête
                bot = world_to_camera_view(sc, self.cam, Vector((hw.x, hw.y, hw.z)))
                fr[n] = {"top": [pv[0].x, 1 - pv[0].y], "cpt": [pv[1].x, 1 - pv[1].y],
                         "tete": [pv[2].x, 1 - pv[2].y], "z": pv[0].z, "dos": self.hidden_counter[f - 1] == n,
                         "zzz": bool(sp.get("_zzz") or sp.get("expression") == "dort"),
                         "taille": abs(pv[0].y - bot.y)}
            meta["frames"].append(fr)
        Path(self.job["work_dir"], "meta.json").write_text(json.dumps(meta))

    def render(self):
        sc = self.scene
        shot = self

        def handler(scene, depsgraph=None):
            shot.apply_frame(scene.frame_current)
        bpy.app.handlers.frame_change_pre.clear()
        bpy.app.handlers.frame_change_pre.append(handler)
        self.write_meta()
        Path(self.job["frames_dir"]).mkdir(parents=True, exist_ok=True)
        if self.job.get("only_frames"):
            for f in self.job["only_frames"]:
                sc.frame_set(f)
                sc.render.filepath = str(Path(self.job["frames_dir"]) / f"f_{f:04d}")
                bpy.ops.render.render(write_still=True)
            return
        t0 = time.time()
        bpy.ops.render.render(animation=True)
        log(f"rendu {self.N} images en {time.time() - t0:.0f} s")


def main():
    job = json.loads(Path(sys.argv[-1]).read_text())
    t0 = time.time()
    shot = Shot(job)
    shot.build()
    log(f"scène construite en {time.time() - t0:.1f} s ({len(bpy.data.objects)} objets)")
    shot.render()


if __name__ == "__main__":
    main()
