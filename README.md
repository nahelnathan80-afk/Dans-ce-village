# Dans ce village

Série TikTok « storytime absurde » (1080×1920, 30 fps) entièrement générée en code :
**Remotion** (React) pour le montage, **Three.js / @react-three/fiber** pour la 3D,
**Piper** (TTS local gratuit) pour la voix, bruitages et musique **synthétisés** (libres de droits).

📺 Vidéo finale : [`rendu/ep01-un-euro-le-mot.mp4`](rendu/ep01-un-euro-le-mot.mp4)

## Installation

```bash
npm install
pip install piper-tts onnx soundfile scipy numpy
# voix françaises Piper (depuis huggingface.co/rhasspy/piper-voices) → tools/models/
#   fr_FR-tom-medium.onnx(.json), fr_FR-upmc-medium.onnx(.json)
```
`ffmpeg` doit être installé (utilisé pour le changement de hauteur de voix).

## Commandes

| Commande | Rôle |
|---|---|
| `npm run voice` | Génère `public/ep01/voice.wav` + `src/episodes/ep01/timeline.json` (timestamps par mot, issus de Piper) |
| `npm run audio` | Synthétise les bruitages (`public/sfx`) et la musique (`public/music`) |
| `npm run studio` | Ouvre Remotion Studio pour prévisualiser |
| `node tools/contact-sheet.mjs` | Une image par réplique → `out/sheet/` (vérif rapide des cadrages) |
| `npm run preview` | Rendu basse qualité |
| `npm run render` | MP4 final H.264 → `rendu/` |

## Architecture

```
src/
  lib/timeline.ts        Timeline : réplique → frames, solde, mots payants, bouches
  lib/anim.ts            ramp, pop, punch (zoom), squash & stretch, clignements
  three/Character.tsx    Personnage blocky paramétrable (tenue, coiffure, chapeau, pose, marche)
  three/faceTexture.ts   Visages 2D dessinés (11 émotions + bouche animée)
  three/Village.tsx      Décor : place, fontaine, boulangerie, mairie, clocher, chalets, montagnes, téléphérique
  three/BakeryInterior   Intérieur boulangerie (four, jauge, comptoir)
  three/Props.tsx        Pancartes, croissants, bouée, lampes, farine, fumée, explosion
  three/Crowd.tsx        Foule (attend, lève la tête, ignore, fuit, applaudit)
  three/Stage.tsx        Scène 3D : ciel, lumière, brouillard, caméra (+ tremblement)
  overlay/               Compteur SOLDE, sous-titres mot par mot, « −1 € », effets 2D
  episodes/cast.ts       Les habitants de la série
  episodes/ep01/         script.json (source unique) → shots.tsx (plans) → Episode.tsx (montage + sons)
tools/tts.py, sfx.py     Voix + timestamps, bruitages + musique
```

## Faire un nouvel épisode

1. Copier `src/episodes/ep01` → `ep02`, réécrire `script.json` (répliques, qui parle, mots payants).
2. `python3 tools/tts.py ep02` → voix + timeline.
3. Adapter `shots.tsx` : chaque plan démarre sur une réplique (`tl.f('id')`), donc tout se recale
   automatiquement si le texte change.
4. Ajouter la composition dans `src/Root.tsx`, puis rendre.

Zones sûres TikTok respectées : rien d'important dans les 15 % du bas ni dans la colonne de droite.
