"""Lecture et validation d'un scenario.json (format documenté dans le README).

Le fichier peut contenir des commentaires « // … » : ils sont retirés avant
le décodage JSON (sans toucher aux « // » à l'intérieur des chaînes).
"""
import json
import re
from pathlib import Path

from . import config

PRESETS_CAMERA = [
    "plan_large", "travelling_suivi", "gros_plan_visage", "gros_plan_objet",
    "contre_plongee", "plongee", "zoom_lent_avant", "panoramique",
    "orbite_lente", "par_dessus_epaule",
]
DECORS = ["rue", "cuisine", "salle_classe", "chambre_ado", "chambre_cartons", "college_autel"]
ACTIONS = ["marcher", "attendre", "parler", "s_asseoir", "assis", "se_lever", "regarder",
           "sursauter", "frissonner", "passer", "serrer", "toucher", "poser"]
EXPRESSIONS = ["neutre", "joyeux", "triste", "peur", "choque", "pleure",
               "interrogatif", "pensif", "vide"]
MUSIQUE = ["normal", "baisse", "coupe"]


class ScenarioError(Exception):
    pass


def strip_comments(text: str) -> str:
    """Retire les commentaires // (hors chaînes)."""
    out, i, in_str = [], 0, False
    while i < len(text):
        c = text[i]
        if in_str:
            out.append(c)
            if c == "\\":
                out.append(text[i + 1]); i += 1
            elif c == '"':
                in_str = False
        elif c == '"':
            in_str = True; out.append(c)
        elif text.startswith("//", i):
            while i < len(text) and text[i] != "\n":
                i += 1
            continue
        else:
            out.append(c)
        i += 1
    # tolère les virgules finales « , ] » ou « , } »
    return re.sub(r",(\s*[\]}])", r"\1", "".join(out))


def load_jsonc(path: Path):
    try:
        return json.loads(strip_comments(Path(path).read_text(encoding="utf-8")))
    except json.JSONDecodeError as e:
        raise ScenarioError(f"{path} : JSON invalide ligne {e.lineno} colonne {e.colno} ({e.msg})")


def load_character(name: str) -> dict:
    """Cherche personnages/<nom>.json puis personnages/figurants/<nom>.json."""
    for p in (config.PERSONNAGES / f"{name}.json", config.PERSONNAGES / "figurants" / f"{name}.json"):
        if p.exists():
            d = load_jsonc(p)
            d.setdefault("id", name)
            d["_fichier"] = str(p)
            return d
    raise ScenarioError(f"Personnage « {name} » introuvable (personnages/{name}.json)")


def parse_time(v, duree: float, defaut: float = 0.0) -> float:
    """« 55% » → fraction de la durée du plan ; nombre → secondes."""
    if v is None:
        return defaut
    if isinstance(v, str) and v.strip().endswith("%"):
        return duree * float(v.strip()[:-1]) / 100.0
    return float(v)


def load_episode(nom: str) -> dict:
    ep_dir = config.EPISODES / nom
    path = ep_dir / "scenario.json"
    if not path.exists():
        raise ScenarioError(f"{path} introuvable")
    sc = load_jsonc(path)
    sc["_dir"] = str(ep_dir)
    sc["_nom"] = nom
    errors = []
    ids = set()
    for k, p in enumerate(sc.get("plans", []), 1):
        pid = p.setdefault("id", f"plan{k:02d}")
        if pid in ids:
            errors.append(f"{pid} : id en double")
        ids.add(pid)
        if p.get("decor") not in DECORS:
            errors.append(f"{pid} : décor « {p.get('decor')} » inconnu ({', '.join(DECORS)})")
        p.setdefault("mood", "soleil_matin")
        p.setdefault("personnages", [])
        p.setdefault("cadrages", [])
        p.setdefault("bulles", [])
        p.setdefault("textes_decor", [])
        p.setdefault("musique", "normal")
        if p["musique"] not in MUSIQUE:
            errors.append(f"{pid} : musique « {p['musique']} » (attendu : {MUSIQUE})")
        for c in p["cadrages"]:
            if c.get("camera") not in PRESETS_CAMERA:
                errors.append(f"{pid} : caméra « {c.get('camera')} » inconnue ({', '.join(PRESETS_CAMERA)})")
            c.setdefault("duree", 1.0)
        for perso in p["personnages"]:
            perso.setdefault("action", "attendre")
            perso.setdefault("expression", "neutre")
            if perso["action"] not in ACTIONS:
                errors.append(f"{pid} : action « {perso['action']} » inconnue ({', '.join(ACTIONS)})")
            if perso["expression"] not in EXPRESSIONS:
                errors.append(f"{pid} : expression « {perso['expression']} » inconnue ({', '.join(EXPRESSIONS)})")
            try:
                perso["_def"] = load_character(perso["qui"])
            except ScenarioError as e:
                errors.append(f"{pid} : {e}")
        v = p.get("voix")
        if v is None and "duree" not in p:
            errors.append(f"{pid} : plan sans voix → ajoute \"duree\": <secondes>")
        if v is not None:
            v.setdefault("fichier", f"voix/{pid}.mp3")
    if errors:
        raise ScenarioError("Erreurs dans le scénario :\n  - " + "\n  - ".join(errors))
    return sc


def plain_text(texte: str) -> str:
    """Texte lu par la voix : sans les astérisques des mots-clés."""
    return texte.replace("*", "")


def words_with_keywords(texte: str):
    """« la date de sa *mort*. » → [('la',False),…,('mort.',True)]"""
    out, inside = [], False
    for w in texte.split():
        n = w.count("*")
        kw = inside or n > 0           # gère aussi « *tout le monde* »
        if n % 2 == 1:
            inside = not inside
        out.append((w.replace("*", ""), kw))
    return out
