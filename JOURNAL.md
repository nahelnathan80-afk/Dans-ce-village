# Journal du projet « Dans cette ville » — générateur de vidéos

Ce fichier résume tout ce qui a été fait, les choix pris et comment reprendre
le travail si la session cloud est perdue. Il est mis à jour au fil du travail.

Branche de travail : `claude/video-generator-dans-cette-ville-2mn6k8`

---

## 1. Où en est-on ? (26/11/2026, 17 h 30 heure de Paris)

| Élément | État |
|---|---|
| Générateur (`src/dcv/`, scripts) | ✅ terminé, commité |
| Scénario `episodes/leo_hier/scenario.json` (14 plans) | ✅ validé par toi |
| 13 voix de Grégory (ElevenLabs) dans `episodes/leo_hier/voix/` | ✅ commitées |
| 1er aperçu (voix temporaire Piper) | ✅ poussé, puis remplacé |
| Aperçu avec la voix de Grégory (540×960, 81,8 s) | ⏳ en cours de rendu, poussé automatiquement à la fin |
| Rendu FINAL 1080×1920 | ⏳ démarre automatiquement après l'aperçu, ≈ 4 h. Le MP4 sera poussé tout seul dans `output/leo_hier/leo_hier.mp4` |

### Si la session est perdue, comment reprendre
1. Ouvre une nouvelle session Claude Code sur ce dépôt, sur la branche ci-dessus.
2. Demande : « Lis JOURNAL.md, puis lance `./scripts/make_episode.sh leo_hier final` ».
   - `setup.sh` réinstalle tout automatiquement (≈ 3 min).
   - Si le cache (`cache/`) a été perdu avec l'ancienne session, le final repart de
     zéro (≈ 4 h). S'il existe encore, le rendu reprend où il s'était arrêté.
3. À la fin, le MP4 est commité et poussé tout seul (il fait moins de 100 Mo).

---

## 2. Choix techniques (et pourquoi)

- **Le prototype** sur la branche `claude/epic-mccarthy-pfcf2s` était en
  Remotion/Three.js, sans `src/dcv/`. On a donc créé `src/dcv/` en Python + Blender,
  comme demandé.
- **Blender** : installé comme module Python (`bpy` 5.3) depuis PyPI. download.blender.org
  et github.com sont bloqués dans l'environnement, mais PyPI suffit.
- **Rendu sans GPU** : Eevee fonctionne en mode headless grâce à Mesa (EGL « surfaceless »).
  Mesures sur 4 cœurs CPU :
  - le coût dépend surtout du nombre d'échantillons, pas de la résolution ;
  - Eevee à 1 échantillon : ≈ 1,1 s/image en 540×960 sans ombres ;
  - Eevee à 1 échantillon : ≈ 5,5 s/image en 1440×2560 avec les ombres du soleil ;
  - Cycles est plus lent pour un résultat moins propre ; Workbench est trop terne.
- **Presets** :
  - `apercu` : 540×960, sans ombres, 1 image sur 2 rendue (environ 25 min par épisode).
  - `final` : rendu en 1440×2560 puis réduit en 1080×1920 (lissage des contours), ombres
    actives (environ 4 h par épisode).
- **Voix** :
  1. le MP3 déposé dans `voix/` ;
  2. sinon ElevenLabs par l'API (clé à mettre dans l'environnement) ;
  3. sinon Piper (voix temporaire), et espeak-ng si Piper manque.

  Les voix de leo_hier ont été générées avec le **connecteur ElevenLabs** de Claude :
  - voix « Grégory - Dynamic » (`ctilxqiD5xHFsAqEwjvS`), modèle `eleven_multilingual_v2`,
    une prise par plan ;
  - environ 1 000 crédits utilisés sur les 10 000 du plan gratuit ;
  - flow ElevenLabs utilisé : `O0Fo0WAWDuQNQgiwM4RZ`.
  - ⚠ La première clé API saisie était refusée (« Invalid API key »). C'est inutile
    depuis qu'on passe par le connecteur.
  - ⚠ Le plan gratuit d'ElevenLabs impose de créditer ElevenLabs et interdit l'usage
    commercial. Si tu veux monétiser sur TikTok, il faut un plan payant.
- **Réseau** : le site `elevenlabsusercontent.com` a été ajouté aux sites autorisés de
  l'environnement `dans-ce-village`, pour télécharger les MP3 générés.
- **Timing des sous-titres** : whisper.cpp (`pywhispercpp` + modèle `ggml-base` de
  Hugging Face), puis recalage sur le texte exact du scénario.
- **Musique** : `musique/theme_par_defaut.mp3`, une boucle originale de 32 s
  synthétisée par `tools/make_music.py`, donc libre de droits.
- **Son** :
  - la musique baisse quand la voix parle (ducking) et sur les plans `baisse` ;
  - elle s'arrête net sur un plan `coupe`, puis reprend en fondu de 1,5 s au plan suivant ;
  - normalisation loudnorm en 2 passes à -14 LUFS, puis correction de gain si besoin.

---

## 3. Corrections faites après avoir regardé les images (étape 3)

- La foule était différente à chaque lancement (hasard de Python) : on utilise
  maintenant un hasard fixe (crc32), donc l'aperçu et le final sont identiques.
- Couleurs trop ternes avec AgX : passage à la transformation « Standard », plus
  une exposition adaptée à chaque ambiance (intérieurs -0,35).
- Les plans larges de rue étaient trop loin : caméra rapprochée, et un vrai travelling
  latéral pour la foule.
- Gros plans visage trop serrés : c'est maintenant un plan « visage + compteur »,
  tête vers 45 % de la hauteur, compteur hors de la bande du haut.
- Compteurs longs (AUJOURD'HUI, 12 ANS 4 MOIS) : la pastille s'élargit, et la caméra
  recule selon la largeur du compteur.
- Plans par-dessus l'épaule : le compteur de la personne vue de dos est masqué,
  ainsi que sa bulle de pensée.
- Les figurants qui bouchent la vue sur le sujet sont retirés le temps du cadrage
  (sauf dans les plans d'ensemble).
- Pas de figurant devant l'affiche-indice du plan 1.
- Cuisine (indice du plan 6) : nappe rouge pour que les 2 assiettes blanches se voient ;
  plongée grand angle qui montre les 3 chaises ; suspension retirée (la caméra passait
  dedans).
- Miroir : faux miroir robuste (une ouverture dans le mur, avec une copie symétrique
  de la pièce derrière). Le compteur HIER n'apparaît que dans le reflet
  (`"compteur_reflet": true`).
- Câlin du papa (plan 2) : la famille est face caméra, le papa enlace son enfant à
  la bonne hauteur et regarde au loin.
- Bulles BD placées à côté de la tête, pour ne pas cacher le compteur ni le visage ;
  étiquettes de nom à côté du visage quand le compteur est trop haut.
- Photo de l'autel et lumière des bougies surexposées : corrigées.
- Ambiance violette du plan 14 trop saturée : adoucie.
- Sous-titres agrandis (118 px pour 1080 de large, contour de 11 px), largeur limitée
  pour ne pas toucher la colonne de droite de TikTok.
- Durée : avec Grégory, qui parle plus vite, l'épisode tombait à 66,6 s. Ajout de
  `"pause_apres_voix": 1.1` et de durées minimales sur les plans forts → **81,8 s**.

---

## 4. Checklist de l'épisode (dernier rapport)

- [x] La 1re phrase commence par « Dans cette ville, ».
- [x] Aucune phrase de plus de 12 mots (maximum : 12).
- [x] Le cadrage change au moins toutes les 2 s (cadrage le plus long : 2,00 s).
- [x] Indices du plan 1 (affiche + Inès « AUJOURD'HUI ») et du plan 6 (3 chaises,
      2 assiettes) bien visibles.
- [ ] Musique sans silence et -14 LUFS : correction faite et testée à part (-14,4 LUFS),
      à confirmer dans le rapport du nouvel aperçu (`output/leo_hier/rapport_apercu.txt`).

---

## 5. Fichiers importants

```
scripts/setup.sh           réinstalle tout (à chaque nouvelle session)
scripts/make_episode.sh    LA commande : <nom> [apercu|final] [--controle] [--plans …] [--no-push]
src/dcv/                   le générateur (voir README.md → Architecture)
personnages/*.json         Léo, Maman, Sam, M. Paul, le prof, Inès (+ figurants/)
episodes/leo_hier/         scénario + voix
episodes/_exemple/         exemple commenté pour créer un nouvel épisode
musique/theme_par_defaut.mp3
output/leo_hier/           vidéo + rapport (les seuls fichiers de sortie commités)
README.md                  format du scénario + guide iPad
```

---

## 6. Historique

| Heure (UTC) | Action |
|---|---|
| 13 h 55 | Exploration : dépôt vide, prototype Remotion sur une autre branche. Tests : bpy/Eevee/Mesa, whisper.cpp, Piper, police. |
| 14 h 05 | Scénario leo_hier proposé, puis validé. |
| 14 h 10 – 14 h 45 | Écriture du générateur complet, de setup.sh et des personnages. |
| 14 h 45 – 15 h 00 | Planches de contrôle (1 image par cadrage) et 3 séries de corrections. |
| 15 h 00 – 15 h 20 | 1er aperçu complet (25 min), checklist et push. |
| 15 h 45 – 16 h 10 | Connecteur ElevenLabs : 13 voix de Grégory (avec des refus « busy » du plan gratuit). |
| 16 h 11 | Aperçu avec la voix de Grégory lancé, puis enchaînement automatique sur le FINAL. |
