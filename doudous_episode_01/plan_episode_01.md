# Épisode 1 — « Dans mon village, les doudous se réveillent à minuit »

Document à valider AVANT toute dépense de crédits.

---

## 1. Script corrigé

Relecture faite : aucune faute d'orthographe ni d'accent dans le script. Je n'ai touché qu'à la typographie française :
- espace insécable avant « : » et « ? » ;
- guillemets français avec espaces insécables : « Il dort. », « Il en manque un. » ;
- points de suspension en un seul caractère « … ».

Le sens et les mots ne changent pas. Version envoyée à ElevenLabs (avec tags) :

```
[whispers] Dans mon village… les doudous se réveillent à minuit. [pause] [serious] Et cette nuit-là… j'ai vu ce qu'ils font vraiment.

Mon village s'appelle Clairmoulin. Ici, chaque enfant reçoit un doudou le jour de sa naissance. Le mien, c'est Pompon. Un lapin gris, avec un bouton à la place de l'œil gauche.

[softly] Les grands disent que, la nuit, les doudous nous protègent des cauchemars. [pause] Mais il y a une règle que personne n'a le droit d'oublier : ne jamais rester éveillé à minuit.

Personne ne sait pourquoi. Et personne n'a jamais posé la question.

Moi, j'ai voulu savoir.

Cette nuit-là, j'ai fait semblant de dormir. Les yeux presque fermés. Pompon contre moi.

[whispers] Onze heures cinquante-neuf…

[pause] Minuit.

[nervous] Pompon a bougé. Doucement. Il s'est levé… il a regardé si je dormais… et il a sauté par la fenêtre.

Je l'ai suivi. Pieds nus, dans la forêt.

Et là… [pause] j'ai vu tous les doudous du village. Des centaines. En cercle, autour du vieux puits.

Au milieu, il y avait un ours immense, tout recousu. [serious] Le Grand Ours.

Il tenait un carnet. Il appelait les prénoms des enfants, un par un. Et chaque doudou répondait : « Il dort. »

Quand il est arrivé à mon prénom… [pause] Pompon n'a rien dit.

[whispers] Le Grand Ours a refermé le carnet. Et il a dit : « Il en manque un. »

Tous les doudous se sont tournés vers les buissons. Vers moi.

[pause] [serious] Et Pompon… a souri.

[whispers] Demain soir… est-ce que je reste éveillé, ou est-ce que je fais semblant de dormir ? Dis-le-moi en commentaire. La partie 2 arrive très vite.
```

Les sous-titres reprennent ce texte sans les tags.

**Durée** : environ 330 mots. Avec un rythme de conteur, la voix seule devrait faire 1 min 45 à 2 min 05. Avec le silence d'1 s après « Minuit. » et les 2 à 3 s de fin sur Pompon, on peut dépasser 2:00. Dans ce cas je raccourcis seulement les pauses entre les paragraphes, sans toucher au texte. Si la voix sort trop rapide, j'allonge les pauses.

**Réglages voix** : modèle `eleven_v4` (repli `eleven_v3`), voix Grégory - Dynamic `ctilxqiD5xHFsAqEwjvS`, endpoint `/v1/text-to-speech/{voice_id}/with-timestamps`, stabilité « Natural/Creative » pour que les tags soient bien joués, sortie MP3 44,1 kHz 192 kbps. Je génère le texte en un seul bloc pour garder une voix continue. Le silence d'1 s est ajouté au montage, pas par la voix.

---

## 2. Fiches personnages

Les prompts sont en anglais : les modèles d'image le respectent mieux. Ces fiches sont collées mot pour mot dans chaque prompt où le personnage apparaît.

**STYLE (dans tous les prompts)**
> 3D animated feature film style, stylized proportions, soft cinematic lighting, rich textures (felt, fabric, wood), shallow depth of field, gentle film grain, vertical 9:16 composition, highly detailed, sharp focus. No text, no letters, no watermark, no logo.

**JULES — le héros**
> JULES: an 8-year-old boy, small and slim, messy tousled chestnut-brown hair sticking up, big round hazel eyes, a few light freckles on the nose, soft round face, wearing plain soft-blue long-sleeved cotton pajamas (top and trousers) with thin white piping on the collar and cuffs.

**POMPON — le doudou lapin**
> POMPON: a small grey plush rabbit toy (about 35 cm), slightly worn and faded felt with a few pilled spots, long floppy ears with the left ear bent at the tip, a small stitched pink nose, a short stitched mouth line, a round shiny black bead for the RIGHT eye, and a black four-hole sewing button sewn on with white cross-stitch IN PLACE OF THE LEFT EYE. Cute, soft, handmade-looking.

**LE GRAND OURS**
> THE GREAT BEAR: a gigantic teddy bear (about three times the height of a child), honey-brown plush fur covered in mismatched patches (red tartan, green velvet, faded floral cotton, blue corduroy), thick visible cross-stitched seams all over, one ear in a different fabric, round amber glass eyes, calm and solemn expression, holding a small worn brown leather notebook with a ribbon bookmark. Plush and gentle-looking, never scary or gory.

**Ambiances lumineuses**
- A (chaud) : warm golden lantern light, cosy amber and peach tones, dusk.
- B (nuit chambre) : soft moonlight through the window, cool blue tones with a small warm night-light.
- C (forêt) : deep blue night, silver moonlight, light mist, faint cold glow, high contrast, mysterious.

---

## 3. Indices cachés (indices.txt)

1. **Plan 06** : sur le rebord d'une fenêtre éteinte du village, un petit doudou chat blanc est assis tout seul, sans enfant.
2. **Plan 25** : de petites traces de pattes rondes dans la poussière du rebord de la fenêtre de la chambre.
3. **Plan 33** : dans le carnet du Grand Ours, le prénom **« Élise »** est barré d'un trait d'encre rouge, juste au-dessus de **« Jules »**. Si l'accent sort mal après plusieurs essais, j'utiliserai « Lina » et je te préviendrai.

---

## 4. Liste des images (43 plans) et prompts

Pour chaque prompt : `[STYLE] + [ambiance] + description du plan + [fiches des personnages présents]`. Les images des personnages servent de références. LP = plan large, GP = gros plan.

| # | Texte de la voix | Plan | Prompt (description du plan) |
|---|---|---|---|
| 01 | « Dans mon village… » | GP | Extreme close-up of POMPON in near-total darkness, only the black sewing-button eye catches a faint cold glint of moonlight, soft fabric texture barely visible. Ambiance C (dark). |
| 02 | « …les doudous se réveillent à minuit. » | LP | A dark child's bedroom at night, POMPON sitting upright on the pillow, silhouetted against a moonlit window, long soft shadows. Ambiance B. |
| 03 | « Et cette nuit-là… j'ai vu ce qu'ils font vraiment. » | LP | Misty night forest, between dark trees in the distance, the silhouettes of many plush toys standing in a ring, faint glow, seen from far away. Ambiance C. |
| 04 | « Mon village s'appelle Clairmoulin. » | LP | Aerial wide view of a small fairy-tale village at dusk: wooden houses with round thatched roofs, a little windmill, warm glowing lanterns along winding paths, a dense forest all around. Ambiance A. |
| 05 | (suite) | LP | Street level in the village: cobblestone lane, round-roofed wooden houses, hanging lanterns, chimney smoke, purple-orange dusk sky. Ambiance A. |
| 06 | « Ici, chaque enfant… » | moyen | A row of cosy house windows glowing warm; on the sill of one DARK window, a small white plush cat sits all alone (indice 1). Ambiance A. |
| 07 | « …reçoit un doudou le jour de sa naissance. » | moyen | Inside a warm cottage, a smiling mother holds a newborn baby wrapped in a cream blanket while a grandmother gently places a small new plush toy next to the baby. Ambiance A. |
| 08 | (suite) | GP | Close-up of a newborn's tiny hand gripping the soft ear of a new plush toy, warm lantern bokeh. Ambiance A. |
| 09 | « Le mien, c'est Pompon. » | LP | JULES in his cosy wooden bedroom, sitting on his bed and hugging POMPON, toys and drawings around, warm lamp. Ambiance A. + JULES + POMPON |
| 10 | (suite) | moyen | JULES holding POMPON up in front of him at arm's length, smiling, Pompon facing camera. Ambiance A. + JULES + POMPON |
| 11 | « Un lapin gris, avec un bouton… » | GP | Macro close-up of POMPON's face, the black four-hole button sewn in place of the left eye with white cross-stitch, worn grey felt. Ambiance A. + POMPON |
| 12 | « Les grands disent que, la nuit… » | LP | Night view of the village, windows softly lit by night-lights; through a window, a child sleeping with a plush toy. Ambiance B. |
| 13 | « …les doudous nous protègent des cauchemars. » | moyen | A little girl asleep in bed hugging a plush bear; the bear's glass eyes seem open and watchful toward the window. Ambiance B. |
| 14 | « Mais il y a une règle… » | moyen | Two parents standing in a child's doorway, backlit by the hallway lantern, the father raising one finger in warning, kind but serious faces. Ambiance A→B. |
| 15 | « …ne jamais rester éveillé à minuit. » | GP | Close-up of an adult's raised index finger in front of a softly blurred dark window and the moon. Ambiance B. |
| 16 | « Personne ne sait pourquoi… » | LP | The village square at night, all the windows going dark one by one, lanterns dimming, empty cobblestones. Ambiance B→C. |
| 17 | « Moi, j'ai voulu savoir. » | GP | Close-up of JULES lying in bed in the dark, eyes wide open, curious and determined, moonlight across his face. Ambiance B. + JULES |
| 18 | « Cette nuit-là, j'ai fait semblant de dormir. » | LP | JULES's bedroom at night, JULES lying in bed under a quilt with POMPON in his arms, moonlight through the window. Ambiance B. + JULES + POMPON |
| 19 | « Les yeux presque fermés. Pompon contre moi. » | GP | Close-up of JULES's face on the pillow, eyes almost closed, peeking through his lashes, POMPON pressed against his cheek. Ambiance B. + JULES + POMPON |
| 20 | « Onze heures cinquante-neuf… » | GP | A round wooden wall clock in a dark bedroom, clean white face with clear dot markers and only four numerals (12, 3, 6, 9), hands at 11:59 (minute hand one tick before 12). Ambiance B. |
| 21 | « Minuit. » + 1 s de silence | GP | Same clock, both hands pointing straight up at 12, cold moonlight hitting the face. Ambiance B→C. |
| 22 | « Pompon a bougé. Doucement. » | GP | Close-up of POMPON's soft paw slightly lifting on the quilt, as if waking. Ambiance B. + POMPON |
| 23 | « Il s'est levé… » | moyen | POMPON standing on its own on the bed, silhouetted against the moonlit window, JULES "asleep" beside. Ambiance B. + POMPON + JULES |
| 24 | « …il a regardé si je dormais… » | GP | POMPON leaning over JULES's face, peering closely, JULES eyes almost closed. Ambiance B. + POMPON + JULES |
| 25 | « …et il a sauté par la fenêtre. » | LP | POMPON leaping out of the open bedroom window into the blue night, curtains blowing; small round paw prints in the dust on the windowsill (indice 2). Ambiance B→C. + POMPON |
| 26 | « Je l'ai suivi. Pieds nus… » | GP | Close-up of JULES's bare feet stepping on cold mossy ground and roots, blue pajama trouser hems. Ambiance C. + JULES |
| 27 | « …dans la forêt. » | LP | JULES tiny between huge dark trees in a misty blue forest, following a small grey shape far ahead. Ambiance C. + JULES + POMPON |
| 28 | « Et là… » | moyen | Over-the-shoulder of JULES hidden behind leafy bushes, a faint glow from a clearing beyond. Ambiance C. + JULES |
| 29 | « …j'ai vu tous les doudous… Des centaines. » | LP | High wide view of a moonlit forest clearing: hundreds of plush toys (bunnies, bears, ducks, elephants, cats) standing in a perfect ring around an old mossy stone well. Ambiance C. |
| 30 | « En cercle, autour du vieux puits. » | moyen | Low angle along the ring of plush toys standing still, the old stone well in the middle, mist on the ground. Ambiance C. |
| 31 | « Au milieu, il y avait un ours immense… » | LP | THE GREAT BEAR towering in the middle of the ring beside the well, the small plush toys looking up at him. Ambiance C. + THE GREAT BEAR |
| 32 | « …tout recousu. Le Grand Ours. » | GP | Close-up of THE GREAT BEAR's face and chest, patches and thick stitches, amber eyes reflecting moonlight. Ambiance C. + THE GREAT BEAR |
| 33 | « Il tenait un carnet. » | GP | Close-up of an open worn leather notebook held in THE GREAT BEAR's paw, handwritten list of children's first names in ink; one line "Élise" crossed out in red ink, the line below reads "Jules" (indice 3). |
| 34 | « Il appelait les prénoms… un par un. » | moyen | THE GREAT BEAR reading from the notebook, looking down at the ring of plush toys. Ambiance C. + THE GREAT BEAR |
| 35 | « Et chaque doudou répondait… » | moyen | A small plush duck in the ring raising one wing, answering. Ambiance C. |
| 36 | « « Il dort. » » | moyen | A plush elephant and a plush bear raising their paws in turn. Ambiance C. |
| 37 | « Quand il est arrivé à mon prénom… » | moyen | THE GREAT BEAR looking down over the notebook toward one spot in the ring. Ambiance C. + THE GREAT BEAR |
| 38 | « Pompon n'a rien dit. » | GP | POMPON standing silent in the ring, paws down, motionless, other plush toys around with raised paws blurred. Ambiance C. + POMPON |
| 39 | « Le Grand Ours a refermé le carnet. » | GP | Close-up of THE GREAT BEAR's paws closing the leather notebook. Ambiance C. + THE GREAT BEAR |
| 40 | « « Il en manque un. » » | GP | THE GREAT BEAR's face, slightly lowered, eyes glinting, solemn. Ambiance C. + THE GREAT BEAR |
| 41 | « Tous les doudous se sont tournés vers les buissons. » | LP | Wide view: every plush toy in the ring turning its head toward the camera / the bushes at once. Ambiance C. |
| 42 | « Vers moi. » | GP | JULES crouched in the bushes, hands over his mouth, eyes wide with fear, leaves around his face. Ambiance C. + JULES |
| 43 | « Et Pompon… a souri. » + appel à commenter + texte final | GP | Close-up of POMPON in the moonlit clearing, its stitched mouth curved into a small, unsettling smile, the button eye glinting. Cute but eerie. Ambiance C. + POMPON |

Chaque plan dure environ 2 à 3 s (le plan 43 reste plus longtemps, avec le texte final). Les plans sont calés sur les timestamps : chaque image commence au premier mot de son texte.

---

## 5. Production prévue

1. Trois images test (Jules, Pompon, le Grand Ours en fiches de référence, fond neutre) → ta validation du style.
2. Voix (1 génération) + timestamps.
3. 43 images, vérifiées une par une (mains, yeux, bouton à gauche, cohérence) ; les ratées sont régénérées.
4. Montage ffmpeg : Ken Burns rendu en 4K puis réduit en 1080x1920 (pas de tremblement), fondus de 0,3 s, sous-titres karaoké 2 à 4 mots (blanc, contour noir, mot prononcé en jaune), centrés dans la zone sûre, `.srt` exporté.
5. Export H.264 CRF 18, preset slow, 30 i/s, AAC 192 kbps, puis contrôle final.
