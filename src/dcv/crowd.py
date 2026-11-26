"""Figurants générés automatiquement ("foule" dans le scénario).

"foule": {"nombre": 12, "zone": "trottoirs", "action": "attendre|passer|assis",
          "compteurs": "aleatoire", "type": "mixte|eleves|adultes"}
Zones : celles du décor (trottoirs, fond, passage, pupitres…) ou
"autour:<personnage>" (dans un rayon de 2,5 m autour de lui).
"""
import math
import random

PEAUX = ["#f6d1b0", "#e8b48f", "#c68a5e", "#8d5a3b", "#f2c9a0", "#5c3a24"]
CHEVEUX = ["#2b1b12", "#5a3a22", "#a0522d", "#e0c070", "#1a1a1a", "#7a4b2a", "#c0c0c0"]
HAUTS = ["#e63946", "#457b9d", "#2a9d8f", "#f4a261", "#8ecae6", "#b5838d", "#90be6d", "#ffb4a2", "#6d6875", "#219ebc"]
BAS = ["#264653", "#3d405b", "#4a4e69", "#22223b", "#6b705c", "#344e41"]
COIFFURES = ["courte", "meche", "longue", "queue", "bouclee", "courte"]
DUREES = ["23 ANS", "8 MOIS", "56 ANS", "2 JOURS", "61 ANS", "14 ANS", "37 ANS", "5 ANS", "72 ANS",
          "19 JOURS", "44 ANS", "3 SEMAINES", "29 ANS", "67 ANS", "11 ANS", "50 ANS", "6 HEURES", "81 ANS"]
EXPRS = ["neutre", "neutre", "joyeux", "neutre", "vide"]


def random_def(rng, gab):
    return {
        "nom": "figurant", "gabarit": gab,
        "taille": {"enfant": 1.30, "ado": 1.5, "adulte": 1.72, "age": 1.68}[gab] + rng.uniform(-0.06, 0.08),
        "couleurs": {"peau": rng.choice(PEAUX), "cheveux": rng.choice(CHEVEUX if gab != "age" else ["#d9d9d9", "#bfbfbf"]),
                     "haut": rng.choice(HAUTS), "bas": rng.choice(BAS), "chaussures": rng.choice(["#222222", "#ffffff", "#5c4033"])},
        "coiffure": rng.choice(COIFFURES if gab != "age" else ["chauve", "courte"]),
        "haut": rng.choice(["tshirt", "sweat", "chemise", "tshirt", "robe"] if gab != "enfant" else ["tshirt", "sweat"]),
        "accessoires": [{"type": "sac", "couleur": rng.choice(HAUTS)}] if (gab in ("enfant", "ado") and rng.random() < 0.6) else [],
    }


def generate(foule, world, mains, duree, seed=0):
    """Renvoie une liste de « specs » de personnages, comme dans le scénario.
    mains : [(nom, (x, y))] des personnages principaux à ne pas bousculer."""
    if not foule:
        return []
    rng = random.Random(seed)
    n = int(foule.get("nombre", 8))
    action = foule.get("action", "attendre")
    typ = foule.get("type", "eleves" if world.name in ("college_autel", "salle_classe") else "mixte")
    zone = foule.get("zone", "trottoirs")
    if zone.startswith("autour:"):
        who = zone.split(":", 1)[1]
        c = next((p for q, p in mains if q == who), (0, 3))
        rect = (c[0] - 3.2, c[0] + 3.2, c[1] - 0.2, c[1] + 2.8)    # autour et derrière (pas devant)
    else:
        rect = world.zones.get(zone) or (-6, 6, 1, 8)
    specs, placed = [], [p for _, p in mains]
    main_xy = set(placed)
    for i in range(n):
        gab = rng.choice({"eleves": ["enfant", "ado", "ado"], "adultes": ["adulte", "adulte", "age"],
                          "mixte": ["adulte", "adulte", "ado", "enfant", "age"]}[typ])
        d = random_def(rng, gab)
        spec = {"qui": f"figurant{i:02d}", "_def": d, "_foule": True, "etiquette": False,
                "expression": rng.choice(EXPRS)}
        if foule.get("compteurs", "aleatoire") != "aucun":
            spec["compteur"] = rng.choice(DUREES)
        if action == "assis" or zone == "pupitres":
            spec["action"] = "assis"
            spec["objet"] = "pupitre" if world.name == "salle_classe" else None
            free = [s for s in world.seats if not s.get("pris")]
            if not free:
                break
            s = rng.choice(free)
            spec["position"] = [s["x"], s["y"]]
        else:
            for _ in range(60):
                x, y = rng.uniform(rect[0], rect[1]), rng.uniform(rect[2], rect[3])
                ok = all(math.hypot(x - px, y - py) > (1.4 if (px, py) in main_xy else 0.9) for px, py in placed)
                ok = ok and all(not (o[0] - 0.3 < x < o[1] + 0.3 and o[2] - 0.3 < y < o[3] + 0.3) for o in world.obstacles)
                if ok:
                    break
            placed.append((x, y))
            if action == "passer" or (action == "mixte" and rng.random() < 0.5):
                # traversée gauche ↔ droite, en évitant de partir pile sur un principal
                sens = rng.choice([-1, 1])
                spd = rng.uniform(0.8, 1.3)
                L = spd * duree
                x0 = x - sens * L / 2
                # ne pas traverser un personnage principal : on décale la trajectoire
                for _ in range(4):
                    if all(abs(y - my) > 0.65 for _, (mx, my) in mains):
                        break
                    y = y + 0.8 if y + 0.8 < rect[3] else y - 1.6
                spec.update(action="passer", position=[x0, y], vers=[x0 + sens * L, y + rng.uniform(-0.2, 0.2)])
            else:
                spec.update(action="attendre", position=[x, y], orientation=rng.uniform(-55, 55))
                if rng.random() < 0.3:
                    spec["action"] = "parler"
        specs.append(spec)
    return specs
