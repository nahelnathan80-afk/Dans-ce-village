"""Décor « salle de classe » : tableau (texte paramétrable), bureau du
prof, pupitres doubles face au tableau, fenêtres à gauche, carte au mur.
Les élèves regardent vers +Y (le tableau). Sièges de type « pupitre ».
Ancres : piece, tableau, bureau_prof, classe.   Textes : tableau, mur.
"""
import math

from .. import props as P
from .. import scene as S
from . import World, text_for


def build(ctx):
    w = World("salle_classe")
    P.room("cl", 7.4, 5.4, 3.0, "#ffe8b0", "#b5835a", side_wall="#ffe8b0")
    S.box("mur_fond", (7.4, 0.2, 3.0), (0, 5.5, 0), "#c7e9b0", origin="bottom", bevel=0)
    t = text_for(ctx, "tableau", "")
    ec = (t or {}).get("ecrit")
    if ec and ctx.get("n_frames"):
        _tableau_qui_s_ecrit(ctx, t["texte"], ec, w)
    else:
        P.wall_text(ctx, "tableau", "tableau", t["texte"] if t else "", 0.0, 5.4, 1.75, 3.0, emit=0.25)
    w.add_anchor("tableau", 0.0, 5.38, 1.75, 0.0, 3.0)
    # [ep08] la chaise du premier rang qui recule toute seule : "classe": {"chaise_recule": "60%"}
    cl = ctx.get("classe") or {}
    chaise_bouge = cl.get("chaise_recule")
    # bureau du prof
    S.box("bureau_prof", (1.6, 0.7, 0.78), (1.8, 4.2, 0), "#8d5b3a", origin="bottom", bevel=0.02)
    S.box("pile_cahiers", (0.3, 0.22, 0.12), (1.5, 4.2, 0.78), "#4cc9f0", origin="bottom", bevel=0.01)
    # fenêtres (mur gauche)
    for k, y in enumerate((1.0, 2.6, 4.2)):
        P.window(f"fen{k}", -3.7, y, 1.0, 1.1, 1.4, sky=ctx.get("ciel_fenetre", "#9fd3ff"), facing="+X", emit=ctx.get("fenetre_emit", 1.2))
    # carte (mur droit)
    S.box("carte", (0.03, 1.6, 1.0), (3.68, 2.6, 1.3), "#7bdff2", origin="bottom", bevel=0)
    S.box("carte_terre", (0.04, 0.7, 0.5), (3.67, 2.4, 1.5), "#b2f7a1", origin="bottom", bevel=0)
    # pupitres doubles : 3 colonnes × 2 rangées
    for row, ry in enumerate((1.2, 2.5)):
        for cx in (-2.0, 0.0, 2.0):
            S.box("pupitre", (1.5, 0.55, 0.06), (cx, ry, 0.7), "#f4d35e", origin="bottom", bevel=0.01)
            for sx in (-0.65, 0.65):
                S.box("pied", (0.05, 0.45, 0.7), (cx + sx, ry, 0), "#555555", origin="bottom", bevel=0)
            for sx in (-0.38, 0.38):
                ch = P.chair("chaise", cx + sx, ry - 0.55, math.pi, "#ef476f" if row == 0 else "#118ab2", h=0.43)
                if chaise_bouge is not None and row == 1 and cx == 0.0 and sx < 0:
                    _anime_chaise(ctx, ch, chaise_bouge, w)
                w.seats.append({"x": cx + sx, "y": ry - 0.55, "h": 0.43, "yaw": math.pi, "type": "pupitre"})
            w.obstacles.append((cx - 0.8, cx + 0.8, ry - 0.3, ry + 0.3))
    w.add_anchor("piece", 0, 2.8, 1.0, 0.0, 6)
    w.add_anchor("classe", 0, 1.5, 0.9, math.pi, 4)
    w.add_anchor("bureau_prof", 1.8, 4.2, 0.9, 0.0, 1.6)
    w.bounds = (-3.4, 3.4, -6.0, 5.1, 0.3, 2.85)
    w.overview = ((0.0, -3.0, 2.5), (0.0, 3.4, 1.0), 20)
    return w


def _tableau_qui_s_ecrit(ctx, texte, ec, w):
    """Le texte apparaît lettre par lettre (craie) entre ec["debut"] et ec["fin"]."""
    from pathlib import Path
    from math import pi
    from .. import textures as T
    from ..scenario import parse_time
    N, fps = ctx["n_frames"], ctx["fps"]
    D = float(ctx.get("duree", N / fps))
    t0 = parse_time(ec.get("debut", "10%"), D, 0.0)
    t1 = parse_time(ec.get("fin", "70%"), D, D)
    seq = T.Sequence(Path(ctx["tex_dir"]) / "tableau_seq", N)
    total = len(texte)
    for f in range(1, N + 1):
        t = (f - 1) / fps
        u = min(1.0, max(0.0, (t - t0) / max(0.1, t1 - t0)))
        k = int(round(u * total))
        vis = "".join(c if (i < k or c in " \n") else "\u2007" for i, c in enumerate(texte))
        seq.write(f, k, lambda vis=vis: T.tableau_image(vis))
    m = S.image_material(seq.path(1), emit=0.25, alpha=False, name="TXT_tableau", sequence_frames=N)
    h = 3.0 * 800 / 1600
    S.plane("tableau", 3.0, h, (0.0, 5.4 - 0.012, 1.75), m, rot=(pi / 2, 0, 0))


def _anime_chaise(ctx, ch, quand, w):
    from ..scenario import parse_time
    D = float(ctx.get("duree", 5.0))
    t0 = parse_time(quand, D, 0.0)
    x0, y0 = ch.location.x, ch.location.y
    yaw0 = ch.rotation_euler.z
    w.add_anchor("chaise_premier_rang", x0, y0, 0.5, 0.0, 2.2)

    def _chaise(t, ch=ch, t0=t0):
        u = min(1.0, max(0.0, (t - t0) / 0.9))
        u = u * u * (3 - 2 * u)
        ch.location.y = y0 - 0.8 * u
        ch.rotation_euler.z = yaw0 + 0.25 * u
    w.animations.append(_chaise)
