"""Durées des plans et découpage en cadrages.

- Durée d'un plan = durée du MP3 + 0,3 s (ffprobe), au minimum « duree_min »,
  ou « duree » fixe pour un plan sans voix.
- Règle de rythme : un changement de cadrage toutes les 1,5 à 2 s. Si le
  scénario ne donne pas assez de cadrages, on complète avec des presets
  différents ; un cadrage trop long est coupé en deux.
"""
import math

from . import config
from .scenario import parse_time

# Presets de secours selon le type de cible, dans l'ordre de préférence
AUTO_PERSO = ["gros_plan_visage", "plan_large", "contre_plongee", "orbite_lente",
              "zoom_lent_avant", "par_dessus_epaule", "plongee"]
AUTO_OBJET = ["gros_plan_objet", "plongee", "zoom_lent_avant", "plan_large", "orbite_lente"]
AUTO_DECOR = ["plan_large", "panoramique", "plongee", "zoom_lent_avant"]


def _kind(cible: str, persos: set) -> str:
    base = cible.split(">")[0].split(":")[-1]
    if cible.startswith("compteur:") or base not in persos:
        return "objet" if base not in ("rue", "piece", "foule", "autel") else "decor"
    return "perso"


def _auto_list(cible, persos):
    k = _kind(cible, persos)
    return AUTO_PERSO if k == "perso" else AUTO_OBJET if k == "objet" else AUTO_DECOR


def _other_preset(prev: str, cible: str, persos: set, used: list) -> str:
    lst = _auto_list(cible, persos)
    for p in lst:
        if p != prev and p not in used[-2:]:
            return p
    return lst[0] if lst[0] != prev else lst[1]


def plan_cadrages(plan: dict, d: float) -> list:
    """Renvoie [{camera, cible, t0, t1, auto}] couvrant [0, d]."""
    persos = {p["qui"] for p in plan["personnages"]}
    cads = [dict(c) for c in plan["cadrages"]]
    if not cads:
        cible = plan["personnages"][0]["qui"] if plan["personnages"] else "piece"
        cads = [{"camera": _auto_list(cible, persos)[0], "cible": cible, "duree": 1}]
    n_min = math.ceil(d / config.CADRAGE_MAX - 1e-6)
    n_max = max(1, math.floor(d / config.CADRAGE_MIN + 1e-6))
    # trop peu de cadrages → on en ajoute (cibles alternées)
    while len(cads) < n_min:
        last = cads[-1]
        cible = cads[len(cads) % len(cads)]["cible"] if len(cads) > 1 else last["cible"]
        cads.append({"camera": _other_preset(last["camera"], cible, persos, [c["camera"] for c in cads]),
                     "cible": cible, "duree": 1, "auto": True})
    # beaucoup trop de cadrages pour un plan court → on garde les premiers
    if len(cads) > max(n_max, n_min) and d / len(cads) < 1.0:
        cads = cads[:max(n_max, n_min)]
    tot = sum(float(c.get("duree", 1)) for c in cads)
    segs, t = [], 0.0
    for c in cads:
        L = d * float(c.get("duree", 1)) / tot
        segs.append({"camera": c["camera"], "cible": c["cible"], "t0": t, "t1": t + L, "auto": c.get("auto", False),
                     **({"angle": c["angle"]} if c.get("angle") else {})})
        t += L
    # un cadrage > 2 s est coupé en deux (2e moitié : autre preset, même cible)
    changed = True
    while changed:
        changed = False
        for i, s in enumerate(segs):
            if s["t1"] - s["t0"] > config.CADRAGE_MAX + 1e-6:
                mid = (s["t0"] + s["t1"]) / 2
                other = _other_preset(s["camera"], s["cible"], persos, [x["camera"] for x in segs[:i + 1]])
                segs[i:i + 1] = [dict(s, t1=mid), dict(s, t0=mid, camera=other, auto=True)]
                changed = True
                break
    for s in segs:
        s["t0"], s["t1"] = round(s["t0"], 3), round(s["t1"], 3)
    return segs


def build_timeline(sc: dict, voix: dict) -> list:
    """voix : {plan_id: (mp3_path|None, duree_mp3|None, origine)}.
    Renvoie une liste de « specs » de plan avec durées, début, cadrages,
    bulles, étiquettes de nom et pensées (« ? », « … »)."""
    casting = set(sc.get("casting", []))
    # respiration après chaque réplique (réglable par épisode : "pause_apres_voix")
    pad = float(sc.get("pause_apres_voix", config.PAD_VOIX))
    deja_presente = set()
    t = 0.0
    specs = []
    hud_cfg = sc.get("compteur_haut")       # pastille fixe en haut (ex. « INVITÉS : N »)
    hud_val = None
    for i, plan in enumerate(sc["plans"]):
        mp3, dmp3, origine = voix[plan["id"]]
        delai = float(plan.get("voix_delai", 0.0))     # silence voulu avant la voix
        voix_debut = config.VOIX_DEBUT + delai
        if dmp3:
            d = voix_debut + dmp3 + pad
        else:
            d = float(plan.get("duree", 3.0))
        d = max(d, float(plan.get("duree_min", 0)))
        d = round(d * config.FPS) / config.FPS
        carte = plan.get("type") == "carte_question"
        cads = [] if carte else plan_cadrages(plan, d)
        bulles = []
        for b in plan.get("bulles", []):
            t0 = parse_time(b.get("debut"), d, 0.0)
            t1 = parse_time(b.get("fin"), d, d)
            bulles.append({"qui": b["qui"], "texte": b["texte"], "t0": t0, "t1": max(t0 + 0.8, t1)})
        etiquettes, pensees = [], []
        for p in plan["personnages"]:
            q = p["qui"]
            e = p.get("etiquette")
            if e is True or (e is None and q in casting and q not in deja_presente):
                nom = p["_def"].get("etiquette", p["_def"].get("nom", q)).upper()
                etiquettes.append({"qui": q, "texte": nom, "t0": 0.15, "t1": min(d, 2.4)})
                deja_presente.add(q)
            if p["expression"] in ("interrogatif", "pensif") and not carte:
                pensees.append({"qui": q, "texte": "?" if p["expression"] == "interrogatif" else "…",
                                "t0": 0.3 * d, "t1": d})
        # pastille du haut : valeur de départ → d'arrivée sur la durée du plan
        hud = None
        if hud_cfg and not carte:
            v = plan.get("invites", hud_val if hud_val is not None else 0)
            if isinstance(v, dict):
                de, a = float(v.get("de", hud_val or 0)), float(v.get("a", hud_val or 0))
                courbe = v.get("courbe", "lineaire")
            else:
                de = a = float(v)
                courbe = "fixe"
            hud = {"label": hud_cfg.get("label", ""), "de": de, "a": a, "courbe": courbe,
                   "style": plan.get("invites_style", "normal"), "effet": plan.get("invites_effet"),
                   "zoom": [(c["t0"], c["t1"]) for c in cads if c["cible"] == "compteur_haut"]}
            hud_val = a
        fin = plan.get("fin") or {}
        specs.append({
            "index": i, "id": plan["id"], "debut": round(t, 3), "duree": d,
            "noir": float(fin.get("noir", 0)), "voix_mp3": str(mp3) if mp3 else None,
            "voix_duree": dmp3, "voix_origine": origine,
            "cadrages": cads, "bulles": bulles, "etiquettes": etiquettes, "pensees": pensees,
            "voix_debut": voix_debut, "hud": hud, "transition": plan.get("transition"),
            "meteo": plan.get("meteo"), "carte": plan.get("carte") if carte else None,
            "fond": plan.get("fond"),
        })
        t += d
    return specs
