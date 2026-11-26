"""Sous-titres .ass (incrustés par FFmpeg/libass).

- mot par mot ; les petits mots (≤ 3 lettres : « de », « la », « à »…) sont
  groupés avec le mot suivant (2-3 mots très courts max) ;
- Montserrat ExtraBold, blanc, gros contour noir, ombre douce ;
- mots-clés *entre astérisques* en jaune ;
- centrés horizontalement un peu à gauche (colonne de droite TikTok libre),
  à 63 % de la hauteur (zone 55-70 %), jamais dans les 15 % du bas ;
- petite animation « pop » à l'apparition.
"""
from PIL import ImageDraw, Image

from . import config
from .textures import font

FS = 92            # taille de base (pour 1080×1920)
X, Y = 500, 1210   # position (centre) ; 1210 / 1920 = 63 %
MAXW = 820         # largeur max (px) : de 90 à 910 → hors colonne de droite


def _is_short(w):
    core = w.strip(".,;:!?…»«\"'")
    return len(core) <= 3 and w[-1:] not in ".,;:!?…"


def group_words(mots):
    groups, cur = [], []
    for m in mots:
        cur.append(m)
        chars = sum(len(x["mot"]) for x in cur)
        if _is_short(m["mot"]) and len(cur) < 3 and chars <= 9:
            continue           # on attend le mot suivant
        groups.append(cur)
        cur = []
    if cur:
        groups.append(cur)
    return groups


def _ts(t):
    t = max(0.0, t)
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _esc(s):
    return s.replace("{", "(").replace("}", ")")


def build_ass(entries, out_path):
    """entries : liste de (debut_absolu_voix, mots[{mot, cle, t0, t1}], fin_plan)."""
    meas = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {config.W}
PlayResY: {config.H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Mot,{config.FONT_NAME},{FS},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,1,0,1,9,4,5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for start, mots, fin_plan in entries:
        groups = group_words(mots)
        for i, g in enumerate(groups):
            t0 = start + g[0]["t0"]
            if i + 1 < len(groups):
                t1 = start + groups[i + 1][0]["t0"]
            else:
                t1 = min(start + g[-1]["t1"] + 0.45, fin_plan)
            t1 = max(t1, t0 + 0.18)
            txt = " ".join(x["mot"] for x in g)
            w = meas.textlength(txt, font=font(FS, False)) * 1.06
            fs = FS if w <= MAXW else int(FS * MAXW / w)
            parts = []
            for x in g:
                if x["cle"]:
                    parts.append(r"{\c&H00E1FF&}" + _esc(x["mot"]) + r"{\c&HFFFFFF&}")   # jaune
                else:
                    parts.append(_esc(x["mot"]))
            anim = (r"{\pos(%d,%d)\fs%d\fscx70\fscy70\t(0,90,\fscx108\fscy108)\t(90,160,\fscx100\fscy100)}"
                    % (X, Y, fs))
            lines.append(f"Dialogue: 0,{_ts(t0)},{_ts(t1)},Mot,,0,0,0,,{anim}{' '.join(parts)}")
    out_path.write_text(head + "\n".join(lines) + "\n", encoding="utf-8")
    return len(lines)
