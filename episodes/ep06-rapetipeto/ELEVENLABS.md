# Ép. 06 « Rapetipeto » — fichiers à générer sur ElevenLabs

Dépose les fichiers ici :
- `voix/dialogue.mp3` (Text to Dialogue, modèle **eleven_v3**)
- `musique/originale.mp3` (ton extrait de 13,4 s ; le moteur le ramène à −14 LUFS)
- `musique/fond_instrumental.mp3` et `musique/chorale_finale.mp3` (ElevenLabs Music)

Puis : `./scripts/make_episode.sh ep06-rapetipeto final`

## 1. Voix (une voix par personnage dans Text to Dialogue)

| Personnage | Voix ElevenLabs | Pourquoi |
|---|---|---|
| Narrateur + Léon | **Mathis - Calm & Stressing** (`dOysIsLdyDqcTPt5yqat`) | la voix de la série |
| M. Grisou | **HenryD-pro** (`59dhv4BKONM60oDSKECM`) — « an old French guy » ; sinon *Voix grand père* (`t4fHUMAMZxaaV2inHOnb`) | vieil homme grave et rocailleux, très différent d'une voix chantée chaude |
| M. le Maire | **Bertrand** (`VkaZIhUiivhUrS1jLYIj`) avec la balise [pompous] | voix parisienne assurée → pompeuse et un peu ridicule |
| Mamie Rose | **Loulou** (`1T2MOlQA0Xp3hNv1dBxp`) | femme de 60 ans vive et enthousiaste |
| Lou (5 ans) | aucune voix française de petite fille dans la bibliothèque (la seule est en hindi) → **Voice Design** : « petite fille française de 5 ans, voix aiguë, espiègle, un peu boudeuse, accent standard » | |

Aucune de ces voix n'est une voix d'homme chaude et chantante comme celle de la chanson.

## 2. Texte à coller dans Text to Dialogue (une ligne par réplique)

Les balises v3 sont en anglais (c'est ce que le modèle comprend le mieux).

```
Narrateur: [conspiratorial] Dans mon village, on habite dans des citrouilles. Et si on arrête de chanter, elles pourrissent.
Narrateur: [ominous] Un soir, il n'en restait qu'une.
Narrateur: [lively] Tout a commencé dimanche.
Narrateur: [playful] Moi, c'est Léon. Chaque matin, tout le village chante. [suspicious] Sauf lui.
Grisou: [grumpy] [shouting] Cette chanson est interdite !
Maire: [pompous] Mais Grisou…
Grisou: [angry] Interdite ! Sinon, amende !
Narrateur: [sad] Lundi, plus personne ne chantait.
Mamie Rose: [shocked] Ma citrouille fait des rides !
Lou: [disgusted] La mienne sent le fromage !
Narrateur: [serious] Mardi, la moitié du village dormait sous la pluie.
Lou: [shivering] Léon, j'ai froid.
Léon: [determined] Je vais trouver pourquoi.
Narrateur: [curious] Bizarre. La citrouille de Grisou restait orange. Et il ne quittait jamais son casque.
Narrateur: [whispers] Alors mercredi soir, je l'ai espionné.
Narrateur: [whispers] [surprised] Il la chantait. En cachette.
Narrateur: [emotional] C'était sa chanson. Il l'avait écrite à huit ans. Et toute l'école s'était moquée de lui.
Léon: [hesitant] Monsieur Grisou ?
Grisou: [grumpy] [shouting] Va-t'en !
Léon: [emotional] C'est vous qui l'avez écrite !
Grisou: [voice breaking] [sad] Et vous avez ri. Tous.
Narrateur: [warm] Le lendemain, j'ai amené tout le village devant sa porte.
Grisou: [cheerful] [proud] Pour vous remercier : omelette aux hannetons !
Maire: [disgusted] [pompous] Rapeti-beurk.
```

Ne mets aucun silence entre les répliques : le moteur fait lui-même le ping-pong (0,08 à 0,14 s) et la pause dramatique.
Si une réplique est mal prononcée ou manquante, le moteur s'arrête et dit laquelle (il ne devine pas).

## 3. Prompt ElevenLabs Music — `fond_instrumental.mp3` (60 s)

```
Instrumental only, no vocals. Gentle autumn children's folk, 92 BPM, 4/4, C major, cozy village morning.
Fingerpicked acoustic guitar, warm upright bass, soft shaker and hand percussion, light glockenspiel accents,
a little accordion pad. Simple, round, loopable, steady tempo, no lead melody (it sits under dialogue).
Duration 60 seconds, ends on the tonic so it can loop.
```
(Le moteur l'assombrit tout seul pour la partie triste.)

## 4. Prompt ElevenLabs Music — `chorale_finale.mp3` (≈ 9 s)

```
Village choir of children and adults singing in French, joyful autumn children's folk, 92 BPM, 4/4, C major,
same feel and tempo as a gentle folk lullaby with acoustic guitar and soft percussion. A warm older male voice
joins on the last line. Clear diction, every word understandable, about 9 seconds, ends cleanly on the last word.
Lyrics (exact):
Grisou chante dans sa citrouille,
Rapetipeto,
on lui dit pardon,
Fini les embrouilles,
plus de nuit qui mouille,
vive l'omelette aux hannetons !
```
Une fois ton `originale.mp3` reçu, je mesure son tempo et j'ajuste « 92 BPM » dans les deux prompts pour que tout colle.
