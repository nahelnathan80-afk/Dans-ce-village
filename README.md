# Dans cette ville — générateur de vidéos

Série TikTok verticale (1080×1920, 30 i/s). Le générateur fabrique un épisode
complet à partir d'un dossier d'épisode : décors 3D cubiques (Blender), voix off,
sous-titres mot à mot, musique, montage. Tout tourne dans l'environnement cloud
de Claude Code, avec des outils gratuits.

▶ **Dernière vidéo** : [`output/leo_hier/leo_hier.mp4`](output/leo_hier/leo_hier.mp4)

---

## Une commande

```bash
./scripts/make_episode.sh <nom> [apercu|final]
```

| Mode | Rendu | Temps (épisode de 80 s) |
|---|---|---|
| `apercu` | 540×960, sans ombres, 1 image sur 2 rendue | ≈ 45 min |
| `final` | rendu en 1440×2560 puis réduit en 1080×1920, ombres | ≈ 4 h |

Résultat : `output/<nom>/<nom>.mp4`, plus `output/<nom>/rapport_<mode>.txt` (temps de
rendu par plan, checklist). Le MP4 est ensuite commité et poussé sur GitHub pour que
tu le télécharges.

Options :
- `--controle` : rend seulement 1 image au milieu de chaque cadrage →
  `output/<nom>/controle/planXX.jpg`. Les zones sûres TikTok y sont dessinées : rouge
  pour les zones interdites, jaune pour la bande des sous-titres. Ça prend environ 3 min.
- `--plans plan03,plan07` : ne rend que ces plans.
- `--no-push` : rend la vidéo sans la commiter ni la pousser.

À chaque nouvelle session cloud, `make_episode.sh` lance tout seul
`./scripts/setup.sh`, qui réinstalle Blender, Mesa, FFmpeg, Piper, whisper.cpp et la
police.

**Cache** : un plan déjà rendu et inchangé n'est pas re-rendu. Son empreinte tient
compte du JSON du plan, du timing, des personnages, du code et du mode. Un rendu
interrompu reprend là où il s'était arrêté. Le cache (`cache/`) n'est jamais commité.

---

## Dossier d'un épisode

```
episodes/<nom>/
  scenario.json      la liste des plans (voir l'exemple commenté : episodes/_exemple/)
  voix/plan01.mp3    la voix off de chaque plan (un fichier par plan)
  voix/plan02.mp3 …
  musique.mp3        (optionnel) sinon : musique/theme_par_defaut.mp3
```

### D'où vient la voix d'un plan ?
1. `voix/planXX.mp3` si tu l'as déposé ;
2. sinon, ElevenLabs par l'API avec la voix « Grégory - dynamic »
   (`voix_off.elevenlabs_voice_id`), si la clé API est configurée dans l'environnement.
   Le MP3 obtenu est enregistré dans `voix/` ;
3. sinon, une voix **temporaire** locale (Piper, ou espeak-ng à défaut), pour tester.

La durée d'un plan est celle du MP3 + 0,3 s, au minimum `duree_min`. Pour un plan
sans voix, c'est `duree`.

### Format de `scenario.json`
Les commentaires `//` sont autorisés.

| Clé du plan | Rôle |
|---|---|
| `id` | `plan01`… La voix correspondante est `voix/plan01.mp3`. |
| `decor` | `rue`, `cuisine`, `salle_classe`, `chambre_ado` (avec miroir), `chambre_cartons`, `college_autel` |
| `mood` | Ambiance lumière : `soleil_matin`, `matin_interieur`, `matin_froid`, `matin_frais`, `matinee_fraiche`, `classe_froide`, `crepuscule_bleu`, `soir_inquietant`, `soir_violet` |
| `personnages` | Liste de `{qui, position, action, expression, compteur, compteur_style…}` (détail ci-dessous) |
| `foule` | Figurants automatiques : `{nombre, zone, action: attendre\|passer\|mixte\|assis, compteurs}` |
| `cadrages` | Sous-plans caméra : `{camera, cible, duree}` (durée relative). S'il y en a trop peu, d'autres sont ajoutés automatiquement : **un cadrage change toutes les 1,5 à 2 s**. |
| `voix` | `{texte, fichier}`. Les mots `*entre astérisques*` sont en jaune dans les sous-titres. `null` pour un plan sans voix. |
| `duree` / `duree_min` | Durée fixe (plan sans voix) / durée minimale |
| `bulles` | Bulles BD : `{qui, texte, debut, fin}`. Les temps s'écrivent en `"%"` du plan ou en secondes. |
| `textes_decor` | Textes lisibles : `{type: affiche\|journal\|tableau\|panneau, emplacement, texte}` |
| `accessoires` | Cuisine : `{"chaises": 3, "assiettes": 2}` |
| `autel` | `{photo: "leo", fleurs, bougies, effets: [{type: "photo_efface", de, a}]}` |
| `musique` | `normal`, `baisse`, ou `coupe` (arrêt net ; la musique reprend en fondu au plan suivant) |
| `fin` | `{"noir": 1.2}` : secondes de noir après le dernier plan |

**Personnage** : `qui`, `position` ([x, y] ou nom d'ancre), `action`, `expression`,
`compteur`, `compteur_style`, plus les options suivantes : `vers`, `cible`, `regarde`,
`orientation`, `objet`, `debut_action`, `puis`, `etiquette`, `opacite`, `effets`.

- **Actions** : marcher, passer (passe à côté sans voir), attendre, parler (la tête
  bouge), s_asseoir, assis, se_lever, regarder, sursauter, frissonner, serrer (dans
  ses bras), toucher (main sur l'épaule), poser.
- **Expressions** : neutre, joyeux, triste, peur (bouche en vague), choque, pleure
  (larmes bleues), interrogatif (bulle « ? »), pensif (bulle « … »), vide.
- **Compteurs** :
  - `normal`, `rouge`, `orange` ;
  - `rouge_glitch` : le compteur glitche ;
  - `cache` : pas de compteur ;
  - `"compteur_reflet": true` : le compteur n'apparaît que dans le miroir.
- **Effets** :
  - `{"type": "transparence", "de": 0, "a": 0.45}` : le personnage s'efface peu à peu ;
  - `opacite` : transparence fixe ;
  - `photo_efface` : la photo de l'autel s'efface.

**Caméras** : `plan_large`, `travelling_suivi`, `gros_plan_visage`, `gros_plan_objet`,
`contre_plongee`, `plongee`, `zoom_lent_avant`, `panoramique`, `orbite_lente`,
`par_dessus_epaule`.

**Cibles** :
- `leo` : un personnage ;
- `compteur:leo` : le compteur au-dessus de sa tête ;
- `reflet:leo` : son reflet dans le miroir ;
- `leo>sam` : par-dessus l'épaule de Léo, vers Sam ;
- une ancre du décor : `table`, `photo`, `journal`, `autel`, `miroir`, `tableau`… ;
- une vue d'ensemble : `rue`, `piece`, `foule`.

**Ancres et emplacements de texte par décor** :

| Décor | Ancres | Emplacements de texte |
|---|---|---|
| rue | rue, banc, foule | mur_fond_gauche, mur_fond_centre, mur_fond_droite, panneau_rue |
| cuisine | table, pres_table, frigo | frigo |
| salle_classe | tableau, bureau_prof, classe | tableau |
| chambre_ado | lit, miroir, devant_miroir, bureau, poster | poster |
| chambre_cartons | journal, porte, cartons | sol (le journal par terre) |
| college_autel | autel, photo, fronton, college | fronton, carte |

### Personnages (`personnages/*.json`)
```jsonc
{ "nom": "Léo", "etiquette": "LÉO", "gabarit": "enfant", "taille": 1.34,
  "couleurs": { "peau": "#f4cba5", "cheveux": "#6b3f1f", "haut": "#ffd21f", "bas": "#2f5fa7", "chaussures": "#f2f2f2" },
  "coiffure": "meche", "haut": "sweat", "accessoires": [ { "type": "taches" } ] }
```

| Champ | Valeurs |
|---|---|
| `gabarit` | enfant, ado, adulte, age |
| `coiffure` | courte, meche, longue, queue, bouclee, chauve |
| `haut` | tshirt, sweat, chemise, gilet, robe |
| `accessoires` | bonnet, echarpe, lunettes, moustache, taches, sac, canne, cravate |

---

## Sons et sous-titres
- **Sous-titres** :
  - texte : Montserrat ExtraBold, blanc avec gros contour noir, mots-clés en jaune ;
  - rythme : mot par mot, les petits mots étant groupés avec le suivant ;
  - position : à 63 % de la hauteur, légèrement à gauche, pour laisser libre la colonne
    de droite de TikTok ;
  - timing : celui de chaque mot est donné par whisper.cpp (sinon, les mots sont
    répartis selon leur longueur).
- **Musique** :
  - elle joue sous toute la vidéo ;
  - elle baisse quand la voix parle (ducking) et sur les plans marqués `baisse` ;
  - elle s'arrête net sur un plan marqué `coupe`, puis reprend doucement au plan suivant ;
  - le son final est normalisé à -14 LUFS.

## Architecture (`src/dcv/`)
```
build.py        chef d'orchestre (voix → durées → rendu → incrustations → son → montage → rapport)
scenario.py     lecture/validation du scenario.json        timing.py  durées, découpage des cadrages
tts.py          voix (MP3 / ElevenLabs / Piper / espeak)   align.py   timing mot à mot (whisper.cpp)
render_shot.py  rendu d'un plan dans Blender (processus séparé, reprise possible)
scene.py        blocs, matériaux, panneaux                  characters.py  personnage cubique articulé
actions.py      actions (poses calculées)                   faces.py   visages 2D (PIL)
camera.py       presets caméra                              moods.py   ambiances lumière + étalonnage
crowd.py        figurants                                   props.py   mobilier, textes du décor
textures.py     compteurs, affiches, journal, photo         sets/*.py  les 6 décors
overlay.py      bulles, étiquettes, « ? »                   subtitles.py  fichier .ass
audio.py        mixage, ducking, -14 LUFS                   montage.py    assemblage FFmpeg
```

---

## Depuis l'iPad : créer un nouvel épisode

1. Sur **github.com**, ouvre le dépôt et choisis la branche de travail.
2. Va dans `episodes/_exemple/`, ouvre `scenario.json`, puis copie son contenu
   (icône « Copy raw file »).
3. Reviens dans `episodes/`, puis **Add file → Create new file**. Comme nom, tape
   `mon_episode/scenario.json` (le `/` crée le dossier). Colle le contenu, modifie-le,
   puis **Commit changes**.
4. Dépose les voix (voir ci-dessous). Ce n'est pas obligatoire pour un premier test :
   sans MP3, une voix temporaire est générée.
5. Dans Claude Code, demande : *« Lance `./scripts/make_episode.sh mon_episode apercu` »*,
   puis `final` quand l'aperçu te plaît.
6. Pour récupérer la vidéo : sur github.com, ouvre `output/mon_episode/mon_episode.mp4`,
   puis **Download** (icône ⋯ ou « Download raw file »).

### Déposer les MP3 d'ElevenLabs
1. Sur elevenlabs.io, génère une phrase par plan et télécharge chaque MP3.
2. Dans l'app **Fichiers**, renomme-les exactement `plan01.mp3`, `plan02.mp3`… Le
   numéro est celui du `id` du plan, sur 2 chiffres.
3. Sur github.com, ouvre `episodes/<nom>/`, puis **Add file → Upload files**.
4. Choisis les MP3. Ils doivent arriver dans le dossier `voix/` : si ce dossier
   n'existe pas encore, crée d'abord un fichier `episodes/<nom>/voix/.gitkeep` avec
   **Create new file**, ouvre le dossier `voix`, puis fais Upload files.
5. **Commit changes**. Au prochain rendu, les nouvelles voix remplacent les voix
   temporaires, et seuls les plans dont la durée change sont re-rendus.
