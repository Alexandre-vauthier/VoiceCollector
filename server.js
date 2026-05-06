const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;
const DOUBLEURS_DIR = path.join(__dirname, 'Doubleurs');

app.use(express.static(path.join(__dirname, 'public')));
app.use('/Doubleurs', express.static(DOUBLEURS_DIR));

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function isAudioFile(file) {
  return ['.mp3', '.wav', '.ogg', '.m4a'].includes(path.extname(file).toLowerCase());
}

function isImageFile(file) {
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file).toLowerCase());
}

app.get('/api/doubleurs', (req, res) => {
  try {
    const doubleurs = [];
    const folders = fs.existsSync(DOUBLEURS_DIR)
      ? fs.readdirSync(DOUBLEURS_DIR, { withFileTypes: true })
      : [];

    for (const entry of folders) {
      if (!entry.isDirectory()) continue;
      const doubleurName = entry.name;
      const folderPath = path.join(DOUBLEURS_DIR, doubleurName);
      const files = fs.readdirSync(folderPath);
      const audios = [];
      let imageUrl = null;

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (isAudioFile(file)) {
          const filename = path.parse(file).name;
          const id = `${slugify(doubleurName)}--${slugify(filename)}`;
          audios.push({
            id,
            filename: file,
            text: filename,
            url: `/Doubleurs/${encodeURIComponent(doubleurName)}/${encodeURIComponent(file)}`
          });
        }
        if (!imageUrl && isImageFile(file)) {
          imageUrl = `/Doubleurs/${encodeURIComponent(doubleurName)}/${encodeURIComponent(file)}`;
        }
      }

      if (audios.length > 0) {
        doubleurs.push({
          name: doubleurName,
          slug: slugify(doubleurName),
          imageUrl,
          audios
        });
      }
    }

    res.json({ doubleurs });
  } catch (error) {
    console.error('Erreur API /api/doubleurs', error);
    res.status(500).json({ error: 'Impossible de lire les doubleurs.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Voice Collector démarré sur http://localhost:${PORT}`);
});
