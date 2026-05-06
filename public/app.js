const maxDailyPlays = 3;
const loadButton = document.getElementById('loadButton');
const submitButton = document.getElementById('submitGuess');
const guessInput = document.getElementById('guessInput');
const audioContainer = document.getElementById('audioContainer');
const feedback = document.getElementById('feedback');
const dailyStatus = document.getElementById('dailyStatus');
const collectionList = document.getElementById('collectionList');
const unlockAnimation = document.getElementById('unlockAnimation');
const navPlay = document.getElementById('navPlay');
const navCollection = document.getElementById('navCollection');
const playSection = document.getElementById('playSection');
const collectionSection = document.getElementById('collectionSection');
const successModal = document.getElementById('successModal');
const successDoubleurName = document.getElementById('successDoubleurName');
const audioArea = document.querySelector('.audio-area');

let gameState = null;
let doubleurs = [];
let currentExcerpt = null;
let replayAudio = null;

function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .toLowerCase();
}

function createConfetti() {
  const colors = ['#38bdf8', '#60a5fa', '#3b82f6', '#0ea5e9'];
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.top = '-10px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.opacity = Math.random() * 0.5 + 0.5;
    confetti.style.animation = `confettiFall ${1 + Math.random() * 1.5}s ease-in forwards`;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 2500);
  }
}

const style = document.createElement('style');
style.textContent = `
  @keyframes confettiFall {
    to {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

function loadState() {
  try {
    const raw = localStorage.getItem('voiceCollectorState');
    const saved = raw ? JSON.parse(raw) : {};
    const today = new Date().toISOString().slice(0, 10);

    if (saved.day !== today) {
      return {
        unlocked: saved.unlocked || {},
        solvedAudioKeys: saved.solvedAudioKeys || [],
        skippedAudioKeys: [],
        day: today,
        playedCount: 0
      };
    }

    return {
      unlocked: saved.unlocked || {},
      solvedAudioKeys: saved.solvedAudioKeys || [],
      skippedAudioKeys: saved.skippedAudioKeys || [],
      day: today,
      playedCount: saved.playedCount || 0
    };
  } catch (error) {
    console.error('Impossible de lire le state', error);
    return {
      unlocked: {},
      solvedAudioKeys: [],
      skippedAudioKeys: [],
      day: new Date().toISOString().slice(0, 10),
      playedCount: 0
    };
  }
}

function saveState() {
  localStorage.setItem(
    'voiceCollectorState',
    JSON.stringify(gameState)
  );
}

function updateStatus() {
  const remaining = Math.max(0, maxDailyPlays - gameState.playedCount);
  dailyStatus.textContent = `Extraits restants aujourd'hui : ${remaining} / ${maxDailyPlays}`;
}

function showFeedback(message, type = 'info') {
  feedback.textContent = message;
  feedback.className = 'feedback';
  if (type === 'success') feedback.classList.add('success');
  if (type === 'error') feedback.classList.add('error');
}

function showSuccessModal(doubleurName) {
  successDoubleurName.textContent = doubleurName;
  successModal.classList.add('show');
  createConfetti();
}

function hideSuccessModal() {
  successModal.classList.remove('show');
  currentExcerpt = null;
  setAudioPlayer(null);
  guessInput.value = '';
}

function showCollection() {
  hideSuccessModal();
  navCollection.click();
}

function replayAudioExcerpt(url) {
  if (replayAudio) {
    replayAudio.pause();
    replayAudio = null;
  }

  replayAudio = new Audio(url);
  replayAudio.play().catch(() => {
    showFeedback('Impossible de lire l\'extrait. Vérifie ton navigateur.', 'error');
  });
}

function buildCollection() {
  collectionList.innerHTML = '';
  const unlockedNames = Object.keys(gameState.unlocked);
  if (unlockedNames.length === 0) {
    collectionList.innerHTML = '<p>Vous n\'avez encore débloqué aucun doubleur. Jouez pour commencer.</p>';
    return;
  }

  unlockedNames.sort((a, b) => a.localeCompare(b, 'fr'));
  unlockedNames.forEach((name) => {
    const entry = gameState.unlocked[name];
    const card = document.createElement('article');
    card.className = 'collection-card';

    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = entry.imageUrl || 'https://via.placeholder.com/300x300?text=Doubleur';
    img.alt = `${name}`;

    const content = document.createElement('div');
    content.className = 'card-content';
    const title = document.createElement('h3');
    title.textContent = name;
    const list = document.createElement('ul');

    entry.audios.forEach((audio) => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = audio.text;

      const replayButton = document.createElement('button');
      replayButton.className = 'replay-button';
      replayButton.type = 'button';
      replayButton.textContent = 'Rejouer';
      if (audio.url) {
        replayButton.addEventListener('click', () => replayAudioExcerpt(audio.url));
      } else {
        replayButton.disabled = true;
        replayButton.textContent = 'Indisponible';
        replayButton.style.opacity = '0.55';
        replayButton.style.cursor = 'not-allowed';
      }

      item.appendChild(label);
      item.appendChild(replayButton);
      list.appendChild(item);
    });

    content.appendChild(title);
    content.appendChild(list);
    card.appendChild(img);
    card.appendChild(content);
    collectionList.appendChild(card);
  });
}

function getAvailableExcerpt() {
  const pool = [];
  doubleurs.forEach((doubleur) => {
    doubleur.audios.forEach((audio) => {
      if (gameState.solvedAudioKeys.includes(audio.id)) return;
      if (gameState.skippedAudioKeys.includes(audio.id)) return;
      pool.push({
        ...audio,
        doubleurName: doubleur.name,
        imageUrl: doubleur.imageUrl
      });
    });
  });
  return pool;
}

function loadRandomExcerpt() {
  if (gameState.playedCount >= maxDailyPlays) {
    showFeedback('Tu as atteint la limite de 3 extraits aujourd\'hui.', 'error');
    audioArea.classList.add('empty');
    return;
  }

  const available = getAvailableExcerpt();
  if (available.length === 0) {
    showFeedback('Aucun extrait restant pour l\'instant. Reviens demain ou ajoute des fichiers audio.', 'error');
    currentExcerpt = null;
    setAudioPlayer(null);
    audioArea.classList.add('empty');
    return;
  }

  audioArea.classList.remove('empty');
  currentExcerpt = available[Math.floor(Math.random() * available.length)];
  setAudioPlayer(currentExcerpt);
  showFeedback('Écoute l\'extrait puis propose le prénom et nom du doubleur.', 'info');
}

function setAudioPlayer(excerpt) {
  audioContainer.innerHTML = '';
  if (!excerpt) {
    audioContainer.innerHTML = '<p>Sélectionnez un extrait pour commencer.</p>';
    return;
  }

  const audioEl = document.createElement('audio');
  audioEl.controls = true;
  audioEl.src = excerpt.url;
  audioEl.autoplay = true;
  audioContainer.appendChild(audioEl);
  const info = document.createElement('p');
  info.textContent = 'Écoute attentivement, puis entre ta réponse.';
  info.style.color = '#8b949e';
  audioContainer.appendChild(info);
}

function guessCurrentExcerpt() {
  if (!currentExcerpt) {
    showFeedback('Commence par charger un extrait.', 'error');
    return;
  }

  const guess = guessInput.value.trim();
  if (!guess) {
    showFeedback('Saisi le prénom et nom du doubleur.', 'error');
    return;
  }

  const normalizedGuess = normalizeText(guess);
  const normalizedAnswer = normalizeText(currentExcerpt.doubleurName);
  const requiredTokens = normalizedAnswer.split(' ').filter(Boolean);
  const guessTokens = normalizedGuess.split(' ').filter(Boolean);
  const isCorrect = requiredTokens.every((token) => guessTokens.includes(token));

  gameState.playedCount += 1;

  if (isCorrect) {
    gameState.solvedAudioKeys.push(currentExcerpt.id);
    const unlocked = gameState.unlocked[currentExcerpt.doubleurName] || {
      imageUrl: currentExcerpt.imageUrl,
      audios: []
    };
    unlocked.audios = unlocked.audios || [];
    if (!unlocked.audios.find((item) => item.id === currentExcerpt.id)) {
      unlocked.audios.push({
        id: currentExcerpt.id,
        text: currentExcerpt.text,
        url: currentExcerpt.url
      });
    }
    gameState.unlocked[currentExcerpt.doubleurName] = unlocked;
    saveState();
    buildCollection();
    updateStatus();
    showSuccessModal(currentExcerpt.doubleurName);
  } else {
    if (!gameState.skippedAudioKeys.includes(currentExcerpt.id)) {
      gameState.skippedAudioKeys.push(currentExcerpt.id);
    }
    saveState();
    updateStatus();
    showFeedback(`Mauvaise réponse. L'extrait est passé, tu pourras y revenir plus tard.`, 'error');
    currentExcerpt = null;
    setAudioPlayer(null);
  }

  guessInput.value = '';
}

function configureNavigation() {
  navPlay.addEventListener('click', () => {
    navPlay.classList.add('active');
    navCollection.classList.remove('active');
    playSection.classList.remove('hidden');
    collectionSection.classList.add('hidden');
  });

  navCollection.addEventListener('click', () => {
    navCollection.classList.add('active');
    navPlay.classList.remove('active');
    collectionSection.classList.remove('hidden');
    playSection.classList.add('hidden');
  });
}

async function fetchDoubleurs() {
  try {
    const response = await fetch('/api/doubleurs');
    const data = await response.json();
    doubleurs = data.doubleurs || [];
    if (doubleurs.length === 0) {
      showFeedback('Aucun extrait audio trouvé. Place des dossiers dans le dossier "Doubleurs".', 'error');
    }
  } catch (error) {
    console.error('Erreur fetch doubleurs', error);
    showFeedback('Erreur de chargement des doubleurs. Assure-toi que le serveur est démarré.', 'error');
  }
}

async function init() {
  gameState = loadState();
  configureNavigation();
  await fetchDoubleurs();
  updateStatus();
  buildCollection();
  setAudioPlayer(null);

  loadButton.addEventListener('click', loadRandomExcerpt);
  submitButton.addEventListener('click', guessCurrentExcerpt);
  guessInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      guessCurrentExcerpt();
    }
  });
}

init();
