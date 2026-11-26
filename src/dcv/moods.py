"""Ambiances lumineuses (« mood » du scénario).

Chaque ambiance règle : ciel (couleur + intensité), soleil (couleur, force,
hauteur, direction), lumière d'appoint, lampes de rue / fenêtres, et un
étalonnage final appliqué à l'image (gain RVB + saturation).
Règle de la série : on refroidit progressivement mais JAMAIS gris ni sombre
au point d'être illisible (saturation ≥ 1, intensité minimale garantie).
"""
import math

MOODS = {
    # --- ensoleillé, chaud ---
    "soleil_matin": dict(sky=(0.42, 0.68, 1.0), sky_e=1.1, sun=(1.0, 0.88, 0.7), sun_e=4.2, elev=38, azim=-30,
                         fill=(0.7, 0.85, 1.0), fill_e=150, lamps=0.0, window="#bfe6ff",
                         grade=(1.05, 1.0, 0.93), sat=1.12),
    "matin_interieur": dict(sky=(0.5, 0.7, 1.0), sky_e=0.9, sun=(1.0, 0.86, 0.68), sun_e=3.6, elev=30, azim=-25,
                            fill=(1.0, 0.9, 0.78), fill_e=260, lamps=0.0, window="#cdeeff", interior=True,
                            grade=(1.05, 1.0, 0.94), sat=1.1),
    # --- ça se refroidit ---
    "matin_froid": dict(sky=(0.5, 0.66, 1.0), sky_e=0.9, sun=(0.92, 0.94, 1.0), sun_e=3.0, elev=30, azim=-20,
                        fill=(0.75, 0.85, 1.0), fill_e=260, lamps=0.0, window="#a9c9ff", interior=True,
                        grade=(0.98, 1.0, 1.06), sat=1.08),
    "matin_frais": dict(sky=(0.5, 0.68, 1.0), sky_e=0.9, sun=(0.98, 0.94, 0.88), sun_e=3.2, elev=32, azim=-20,
                        fill=(0.85, 0.9, 1.0), fill_e=260, lamps=0.3, window="#b4d4ff", interior=True,
                        grade=(1.0, 1.0, 1.03), sat=1.08),
    "matinee_fraiche": dict(sky=(0.48, 0.66, 0.98), sky_e=1.0, sun=(1.0, 0.95, 0.9), sun_e=3.4, elev=34, azim=-20,
                            fill=(0.75, 0.85, 1.0), fill_e=160, lamps=0.0, window="#b4d4ff",
                            grade=(0.99, 1.0, 1.04), sat=1.06),
    "classe_froide": dict(sky=(0.55, 0.7, 1.0), sky_e=0.85, sun=(0.9, 0.95, 1.0), sun_e=2.8, elev=30, azim=-15,
                          fill=(0.85, 0.92, 1.0), fill_e=300, lamps=0.0, window="#a9c9ff", interior=True,
                          grade=(0.96, 1.0, 1.07), sat=1.05),
    # --- crépuscule, inquiétant (mais lisible et coloré) ---
    "crepuscule_bleu": dict(sky=(0.3, 0.38, 0.85), sky_e=0.9, sun=(0.7, 0.75, 1.0), sun_e=2.4, elev=25, azim=-15,
                            fill=(0.6, 0.7, 1.0), fill_e=280, lamps=1.0, window="#5d7fe0", interior=True,
                            grade=(0.92, 0.98, 1.12), sat=1.1),
    "soir_inquietant": dict(sky=(0.26, 0.28, 0.62), sky_e=1.0, sun=(0.82, 0.62, 1.0), sun_e=2.6, elev=14, azim=-35,
                            fill=(0.45, 0.75, 1.0), fill_e=200, lamps=5.0, window="#4a5fb5",
                            grade=(0.94, 0.96, 1.1), sat=1.12),
    "soir_violet": dict(sky=(0.34, 0.26, 0.62), sky_e=1.0, sun=(0.95, 0.68, 0.9), sun_e=2.6, elev=14, azim=-40,
                        fill=(0.5, 0.8, 1.0), fill_e=220, lamps=6.0, window="#6a4fc0",
                        grade=(0.97, 0.95, 1.07), sat=1.04),
    # --- épisode 04 « Villa Kado » (réutilisables) ---
    "apres_midi_soleil": dict(sky=(0.36, 0.66, 1.0), sky_e=1.15, sun=(1.0, 0.92, 0.75), sun_e=4.6, elev=45, azim=-30,
                              fill=(0.75, 0.88, 1.0), fill_e=160, lamps=0.0, window="#bfe6ff",
                              grade=(1.05, 1.0, 0.94), sat=1.15),
    "coucher_soleil_orange": dict(sky=(0.98, 0.6, 0.42), sky_e=0.9, sun=(1.0, 0.68, 0.42), sun_e=3.0, elev=13, azim=-55,
                                  fill=(0.55, 0.65, 1.0), fill_e=170, lamps=1.0, window="#ffb36b",
                                  grade=(1.03, 0.99, 0.95), sat=1.1, expo=-0.3),
    "nuit_festive": dict(sky=(0.08, 0.1, 0.3), sky_e=1.0, sun=(0.62, 0.68, 1.0), sun_e=1.7, elev=35, azim=-20,
                         fill=(0.9, 0.6, 1.0), fill_e=200, lamps=6.0, window="#ffd59e", guirlandes=True,
                         grade=(1.0, 0.97, 1.05), sat=1.15, expo=-0.35),
    "nuit_pluie": dict(sky=(0.14, 0.2, 0.36), sky_e=1.0, sun=(0.6, 0.7, 1.0), sun_e=1.6, elev=40, azim=-15,
                       fill=(0.6, 0.75, 1.0), fill_e=300, lamps=6.0, window="#ffd59e",
                       grade=(0.94, 0.98, 1.1), sat=1.05, expo=0.0),
    "nuit_douce": dict(sky=(0.16, 0.18, 0.38), sky_e=0.9, sun=(1.0, 0.8, 0.6), sun_e=2.2, elev=30, azim=-20,
                       fill=(1.0, 0.8, 0.6), fill_e=300, lamps=3.0, window="#26315f", interior=True,
                       grade=(1.06, 0.99, 0.95), sat=1.08, expo=-0.2),
    "petit_matin_doux": dict(sky=(0.85, 0.75, 0.95), sky_e=1.0, sun=(1.0, 0.85, 0.72), sun_e=3.2, elev=18, azim=-35,
                             fill=(1.0, 0.88, 0.85), fill_e=280, lamps=0.0, window="#ffd9c2", interior=True,
                             grade=(1.05, 1.0, 0.97), sat=1.08),
}


def get(name):
    if name not in MOODS:
        print(f"   [mood] « {name} » inconnu → soleil_matin. Disponibles : {', '.join(MOODS)}")
        return MOODS["soleil_matin"]
    return MOODS[name]


def apply(scene, m):
    """Crée ciel, soleil et lumière d'appoint dans la scène Blender."""
    import bpy
    world = bpy.data.worlds.new("ciel")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (*m["sky"], 1)
    bg.inputs[1].default_value = m["sky_e"] * 0.85
    # soleil (direction calculée depuis hauteur / azimut ; azimut 0 = vient de la caméra)
    sun_d = bpy.data.lights.new("soleil", "SUN")
    sun_d.color = m["sun"]
    sun_d.energy = m["sun_e"] * 0.8
    sun_d.angle = math.radians(6)
    sun_d.angle = math.radians(1.5)    # ombres nettes : propres même avec peu d'échantillons
    sun = bpy.data.objects.new("soleil", sun_d)
    scene.collection.objects.link(sun)
    el, az = math.radians(m["elev"]), math.radians(m["azim"])
    # la lumière vient de (sin az, -cos az) en hauteur el → on oriente -Z vers l'opposé
    from mathutils import Vector
    src = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    sun.rotation_euler = (-src).to_track_quat("-Z", "Y").to_euler()
    # appoint doux venant de l'avant-droite (débouche les ombres des visages)
    fill_d = bpy.data.lights.new("appoint", "AREA")
    fill_d.color = m["fill"]
    fill_d.energy = m["fill_e"] * 0.6
    fill_d.size = 6.0
    fill_d.use_shadow = False          # seul le soleil projette des ombres (rendu CPU plus rapide)
    fill = bpy.data.objects.new("appoint", fill_d)
    scene.collection.objects.link(fill)
    fill.location = (3.0, -5.0, 3.5)
    fill.rotation_euler = (Vector((0, 3, 1)) - Vector(fill.location)).to_track_quat("-Z", "Y").to_euler()
    scene.view_settings.exposure = m.get("expo", -0.35 if m.get("interior") else -0.1)
    if m.get("interior"):
        # plafonnier diffus
        ceil_d = bpy.data.lights.new("plafonnier", "AREA")
        ceil_d.color = (1.0, 0.95, 0.88) if m["grade"][2] < 1.0 else (0.9, 0.95, 1.0)
        ceil_d.energy = 90
        ceil_d.size = 4.0
        ceil_d.use_shadow = False
        ceil = bpy.data.objects.new("plafonnier", ceil_d)
        scene.collection.objects.link(ceil)
        ceil.location = (0, 2.5, 2.85)
    if m.get("lamps", 0) > 2:
        # lumière chaude locale (bougies, lampadaires) près du centre de la scène
        p_d = bpy.data.lights.new("lueur", "POINT")
        p_d.color = (1.0, 0.7, 0.4)
        p_d.energy = 25
        p_d.use_shadow = False
        p = bpy.data.objects.new("lueur", p_d)
        scene.collection.objects.link(p)
        p.location = (2.4, 4.1, 0.75)
    return sun
