# Voice Collector

Application web simple pour deviner des doubleurs français à partir de courts extraits audio.

## Structure

- `public/` : interface web statique
- `server.js` : serveur Express qui expose l’API et sert les fichiers
- `Doubleurs/` : dossier de contenu, un sous-dossier par doubleur

### Exemple de structure `Doubleurs`

```
Doubleurs/
  Jean Dupont/
    prenom-nom.jpg
    une phrase dite dans l extrait.mp3
    une autre phrase dite.mp3
```

## Installation

1. `npm install`
2. `npm start`
3. Ouvrir `http://localhost:3002`

> Si `3002` est déjà utilisé, démarre le serveur avec une autre valeur : `PORT=3003 npm start`.

## Règles de contenu

- Chaque dossier de doubleur doit être nommé `Prénom Nom`
- Les fichiers audio doivent être au format `mp3`, `wav`, `ogg` ou `m4a`
- Les images peuvent être `jpg`, `jpeg`, `png` ou `webp`

Le serveur détecte automatiquement les sous-dossiers et propose les extraits à deviner.
