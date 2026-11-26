"""Chemins et réglages globaux (aucune dépendance à Blender)."""
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[2]
EPISODES = ROOT / "episodes"
PERSONNAGES = ROOT / "personnages"
OUTPUT = ROOT / "output"
CACHE = ROOT / "cache"
MODELS = ROOT / ".models"
MUSIQUE_DEFAUT = ROOT / "musique" / "theme_par_defaut.mp3"

FPS = 30
W, H = 1080, 1920                    # format final vertical

# Police des sous-titres / textes : Montserrat ExtraBold (apt fonts-montserrat)
FONT_BOLD = "/usr/share/fonts/opentype/montserrat/Montserrat-ExtraBold.otf"
FONT_BLACK = "/usr/share/fonts/opentype/montserrat/Montserrat-Black.otf"
FONT_NAME = "Montserrat ExtraBold"

# Zones sûres TikTok (fractions de l'écran)
SAFE_TOP = 0.10      # barre « Abonnements / Pour toi »
SAFE_BOTTOM = 0.85   # rien d'important sous 85 % de la hauteur
SAFE_RIGHT = 0.82    # colonne de droite (likes, commentaires…)
SAFE_LEFT = 0.05

# Rythme
PAD_VOIX = 0.30          # secondes ajoutées après chaque MP3
VOIX_DEBUT = 0.10        # la voix démarre 0,1 s après le début du plan
FONDU_PLANS = 0.25       # fondu court entre deux plans
CADRAGE_MIN, CADRAGE_MAX = 1.5, 2.0

# Voix ElevenLabs (utilisée si aucun MP3 n'est déposé et si la clé API marche)
ELEVEN_VOICE_ID = os.environ.get("DCV_ELEVEN_VOICE", "ctilxqiD5xHFsAqEwjvS")  # « Grégory - dynamic »
ELEVEN_MODEL = "eleven_multilingual_v2"

# Presets de rendu (mesurés sur CPU 4 cœurs, Eevee via Mesa) :
#  - Eevee coûte surtout par échantillon, très peu par pixel → pour le final on
#    rend en 1440×2560 avec 1 échantillon puis on réduit en 1080×1920 (lissage).
MODES = {
    # aperçu : petite résolution, sans ombres, 1 image sur 2 (≈ 1,5 s/image)
    "apercu": dict(res=(540, 960), out=(540, 960), step=2, samples=1, shadows=False,
                   shadow_scale=0.25, engine="EEVEE", crf=26),
    # final : ombres du soleil, suréchantillonnage (≈ 5,5 s/image)
    "final": dict(res=(1440, 2560), out=(1080, 1920), step=1, samples=1, shadows=True,
                  shadow_scale=0.5, engine="EEVEE", crf=20),
}
