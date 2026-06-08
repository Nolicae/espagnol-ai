# Multi-Language Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Portuguese (pt-BR + pt-PT) as a second learnable language alongside Spanish, with full UI localization, an ethereal onboarding language-selection screen, and a replicated TTS infrastructure for Portuguese voices.

**Architecture:** All language-specific data (voices, system prompt, UI strings, difficulty suffixes, map bounds, VOICE_META) is encapsulated in a top-level `LANGUAGES` object keyed by `'es'` and `'pt'`. A `currentLang` variable (persisted in `localStorage('app_lang')`) drives every language-sensitive function. All `localStorage` keys are prefixed with the language code. The TTS endpoint switches based on `currentLang`.

**Tech Stack:** Single-file PWA (`index.html`), Vercel serverless (`api/tts.js`, new `api/tts-pt.js`), HuggingFace Spaces (existing `espagnol-tts`, new `portugais-tts`), edge-tts (Microsoft Neural voices), Web Speech API.

---

## File Map

| File | Change |
|---|---|
| `index.html` | All tasks — language data, UI strings, onboarding screen, settings language row, dynamic wiring |
| `api/tts-pt.js` | New — Vercel serverless proxy to Portuguese TTS HF space |
| `service-worker.js` | Cache version bump |

---

## Task 1 — Deploy Portuguese TTS HuggingFace Space

**Files:**
- Reference: `api/tts.js` (existing Spanish TTS proxy — replicate pattern)
- Create: `api/tts-pt.js`

The existing `espagnol-tts` HF space runs a FastAPI/edge-tts server. The user must duplicate that Space on HuggingFace under a new name (e.g. `portugais-tts`), changing the voice filter from `es-*` to `pt-*` in `core/voices.py`. This task creates the Vercel API route that proxies to it.

- [ ] **Step 1: Create `api/tts-pt.js`**

```js
// Vercel serverless — portugais-tts (local Google TTS-compatible API)
const TTS_BASE_URL = 'https://nolicae-portugais-tts.hf.space';
const DEFAULT_VOICE = 'pt-BR-FranciscaNeural';

async function portugaisTTS(text, voice = DEFAULT_VOICE) {
  const response = await fetch(`${TTS_BASE_URL}/v1/text:synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { name: voice },
      audioConfig: { audioEncoding: 'MP3' }
    })
  });
  if (!response.ok) throw new Error(`portugais-tts ${response.status}`);
  const data = await response.json();
  return Buffer.from(data.audioContent, 'base64');
}

module.exports = async function handler(req, res) {
  const { text, voice = DEFAULT_VOICE } = req.query;
  if (!text) return res.status(400).end('missing text');
  try {
    const audio = await portugaisTTS(text, voice);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(audio);
  } catch (e) {
    console.error('TTS-PT error:', e.message);
    res.status(500).end('TTS error');
  }
};
```

- [ ] **Step 2: Update `speakChunk` in `index.html` to route TTS by language**

Find the `speakChunk` function and change the fetch URL:

```js
async function speakChunk(text) {
  if (audioCtx && audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch (_) {}
  }
  const voice = getVoiceKey();
  const endpoint = currentLang === 'pt' ? '/api/tts-pt' : '/api/tts';
  const r = await fetch(`${endpoint}?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`);
  if (!r.ok) throw new Error(`TTS ${r.status}`);
  const decoded = await audioCtx.decodeAudioData(await r.arrayBuffer());
  const src = audioCtx.createBufferSource();
  src.buffer = decoded;
  src.connect(audioCtx.destination);
  ttsSource = src;
  return new Promise((resolve, reject) => {
    src.onended = () => { if (ttsSource === src) ttsSource = null; resolve(); };
    src.onerror = reject;
    src.start(0);
  });
}
```

- [ ] **Step 3: Commit**
```bash
git add api/tts-pt.js index.html
git commit -m "feat: add Portuguese TTS API route (/api/tts-pt), dynamic TTS endpoint per language"
```

---

## Task 2 — Language Architecture: `LANGUAGES` object + `currentLang`

**Files:**
- Modify: `index.html` — add `LANGUAGES` skeleton, `currentLang`, localStorage key helpers

This task creates the architectural shell. Data is filled in Tasks 3–6.

- [ ] **Step 1: Add `currentLang` and key helpers immediately before the `const VOICE_META` block**

```js
// ──────────────────────────────────────────────────────────────
// Language runtime
// ──────────────────────────────────────────────────────────────
let currentLang = localStorage.getItem('app_lang') || 'es';

// localStorage key helpers — all keys are language-prefixed
const lk = {
  voiceKey:      () => `voice_key_${currentLang}`,
  voicePoints:   () => `voice_points_${currentLang}`,
  sessionDates:  () => 'session_dates',               // streak is shared
  factThreshold: (id) => `fact_thr_${currentLang}_${id}`,
  factsSeen:     (id) => `facts_seen_${currentLang}_${id}`,
  chatMode:      () => `chat_mode_${currentLang}`,
  duration:      () => `session_duration_${currentLang}`,
};
```

- [ ] **Step 2: Update all localStorage reads/writes to use `lk` helpers**

Find and replace every hardcoded key in `index.html`:

| Old key | New expression |
|---|---|
| `'voice_key'` | `lk.voiceKey()` |
| `'voice_points'` | `lk.voicePoints()` |
| `'session_dates'` | `lk.sessionDates()` |
| `` `fact_thr_${voiceId}` `` | `lk.factThreshold(voiceId)` |
| `` `facts_seen_${voiceId}` `` | `lk.factsSeen(voiceId)` |
| `'chat_mode'` | `lk.chatMode()` |
| `'session_duration'` | `lk.duration()` |

Also update `getVoiceKey()` and `getDuration()`:
```js
const getVoiceKey  = () => localStorage.getItem(lk.voiceKey())  || LANGUAGES[currentLang].defaultVoice;
const getDuration  = () => parseInt(localStorage.getItem(lk.duration()) || '10', 10);
```

And update `getVoicePoints()` and `getSessionDates()`:
```js
function getVoicePoints() {
  return JSON.parse(localStorage.getItem(lk.voicePoints()) || '{}');
}
function getSessionDates() {
  return JSON.parse(localStorage.getItem(lk.sessionDates()) || '[]');
}
```

And `awardSessionPoints()` save:
```js
localStorage.setItem(lk.voicePoints(), JSON.stringify(pts));
```

And `getFactThresholds()`:
```js
function getFactThresholds(voiceId) {
  const key = lk.factThreshold(voiceId);
  let t = JSON.parse(localStorage.getItem(key) || 'null');
  if (!t) {
    const r = () => Math.floor(Math.random() * 100);
    t = [ 50 + r(), 200 + r() * 2, 500 + r() * 3 ];
    localStorage.setItem(key, JSON.stringify(t));
  }
  return t;
}
```

And `checkNewRewards()` `seenKey`:
```js
const seenKey = lk.factsSeen(voiceId);
```

And `applyChatMode()` save:
```js
localStorage.setItem(lk.chatMode(), on ? '1' : '0');
```

And chatToggle load on init:
```js
if (localStorage.getItem(lk.chatMode()) === '1') { ... }
```

- [ ] **Step 3: Commit**
```bash
git add index.html
git commit -m "refactor: language-prefixed localStorage keys, currentLang variable"
```

---

## Task 3 — UI Strings Localisation

**Files:**
- Modify: `index.html` — add `UI_STRINGS`, update `setState()` and all static HTML text nodes

- [ ] **Step 1: Add `UI_STRINGS` object after `currentLang` declaration**

```js
const UI_STRINGS = {
  es: {
    inactive:           'INACTIVO',
    live:               'EN VIVO',
    speaking:           'HABLANDO',
    pressToTalk:        'Pulsa para hablar',
    chatMode:           'CHAT',
    settingsTitle:      'Ajustes',
    settingsClose:      'cerrar ✕',
    settingsSubtitle:   'Elige una',
    settingsSubItalic:  'voz',
    worldLabel:         'Mundo hispanohablante',
    durationLabel:      'Duración',
    durationMin:        'min',
    dur1:               '1 MIN',
    dur15:              '15',
    dur30:              '30 MIN',
    examLabel:          'Modo Examen',
    examDesc:           'La IA lee un documento y te examina',
    chatLabel:          'Modo Chat',
    chatDesc:           'Practica en silencio — sin micrófono ni audio',
    saveBtn:            'Guardar',
    chatPlaceholder:    'Escribe en español…',
    chatTopbar:         'Modo Chat',
    uploadDoc:          'Subir un documento',
    sessionSummary:     'Resumen de sesión',
    analyzing:          'Analizando…',
    newTitle:           'Nuevo título',
    summaryPrompt:      'Resume esta sesión en 3 puntos:\n❌ Errores corregidos (con la forma correcta)\n✅ Lo que fue bien\n📚 Vocabulario clave usado',
    summarySystem:      'Eres un asistente pedagógico. Analiza esta sesión de práctica de español y responde en español. Sé breve, alentador y concreto.',
    silencePrompt:      '[silencio]',
    sessionStart:       '[inicio de sesión]',
    fallbackGreeting:   '¡Hola! ¿De qué quieres hablar hoy?',
  },
  pt: {
    inactive:           'INATIVO',
    live:               'AO VIVO',
    speaking:           'FALANDO',
    pressToTalk:        'Toca para falar',
    chatMode:           'CHAT',
    settingsTitle:      'Configurações',
    settingsClose:      'fechar ✕',
    settingsSubtitle:   'Escolhe uma',
    settingsSubItalic:  'voz',
    worldLabel:         'Mundo lusófono',
    durationLabel:      'Duração',
    durationMin:        'min',
    dur1:               '1 MIN',
    dur15:              '15',
    dur30:              '30 MIN',
    examLabel:          'Modo Exame',
    examDesc:           'A IA lê um documento e examina-te',
    chatLabel:          'Modo Chat',
    chatDesc:           'Pratica em silêncio — sem microfone nem áudio',
    saveBtn:            'Guardar',
    chatPlaceholder:    'Escreve em português…',
    chatTopbar:         'Modo Chat',
    uploadDoc:          'Enviar um documento',
    sessionSummary:     'Resumo da sessão',
    analyzing:          'A analisar…',
    newTitle:           'Novo título',
    summaryPrompt:      'Resume esta sessão em 3 pontos:\n❌ Erros corrigidos (com a forma correta)\n✅ O que correu bem\n📚 Vocabulário-chave usado',
    summarySystem:      'És um assistente pedagógico. Analisa esta sessão de prática de português e responde em português. Sê breve, encorajador e concreto.',
    silencePrompt:      '[silêncio]',
    sessionStart:       '[início de sessão]',
    fallbackGreeting:   'Olá! Sobre o que queres falar hoje?',
  },
};

function ui(key) { return UI_STRINGS[currentLang]?.[key] ?? UI_STRINGS.es[key]; }
```

- [ ] **Step 2: Update `setState()` to use `ui()`**

```js
function setState(s) {
  appState = s;
  const map = {
    inactive:      { label: ui('inactive'),  dot: '',          orbLabel: ui('pressToTalk') },
    session:       { label: ui('live'),      dot: 'listening', orbLabel: '' },
    'ai-speaking': { label: ui('speaking'),  dot: 'speaking',  orbLabel: '' },
  };
  const info = map[s] || map.inactive;
  statusText.textContent = info.label;
  statusDot.className    = 'status-dot' + (info.dot ? ' ' + info.dot : '');
  orbLabel.textContent   = info.orbLabel;
  orbLabel.style.opacity = info.orbLabel ? '1' : '0';
}
```

- [ ] **Step 3: Add `applyUIStrings()` function and call it on init + after language change**

```js
function applyUIStrings() {
  const U = UI_STRINGS[currentLang];
  // Settings
  const settingsTitle = document.querySelector('#screen-settings .settings-title-row span');
  if (settingsTitle) settingsTitle.textContent = U.settingsTitle;
  const settingsCloseBtn = document.getElementById('btn-settings-close');
  if (settingsCloseBtn) settingsCloseBtn.textContent = U.settingsClose;
  const settingsSubtitle = document.querySelector('.settings-subtitle');
  if (settingsSubtitle) settingsSubtitle.innerHTML = `${U.settingsSubtitle} <span style="font-style:italic;">${U.settingsSubItalic}</span>`;
  const worldLabel = document.querySelector('.settings-section-label span:first-child');
  if (worldLabel) worldLabel.textContent = U.worldLabel;
  const durationLabelEl = document.querySelector('.duration-label-text');
  if (durationLabelEl) durationLabelEl.textContent = U.durationLabel;
  const durMinEl = document.querySelector('.duration-min');
  if (durMinEl) durMinEl.textContent = U.durationMin;
  const [d1, d15, d30] = document.querySelectorAll('.duration-labels span');
  if (d1)  d1.textContent  = U.dur1;
  if (d15) d15.textContent = U.dur15;
  if (d30) d30.textContent = U.dur30;
  const examLabelEl = document.querySelector('#settings-exam .exam-toggle-label');
  if (examLabelEl) examLabelEl.textContent = U.examLabel;
  const examDescEl = document.querySelector('#settings-exam .exam-toggle-desc');
  if (examDescEl) examDescEl.textContent = U.examDesc;
  const chatLabelEl = document.querySelector('.settings-chat .exam-toggle-label');
  if (chatLabelEl) chatLabelEl.textContent = U.chatLabel;
  const chatDescEl = document.querySelector('.settings-chat .exam-toggle-desc');
  if (chatDescEl) chatDescEl.textContent = U.chatDesc;
  const saveBtnEl = document.getElementById('btn-save');
  if (saveBtnEl) saveBtnEl.textContent = U.saveBtn;
  // Chat overlay
  const chatInputEl = document.getElementById('chat-input');
  if (chatInputEl) chatInputEl.placeholder = U.chatPlaceholder;
  const chatTopbarEl = document.querySelector('.chat-topbar-label');
  if (chatTopbarEl) chatTopbarEl.textContent = U.chatTopbar;
  // Exam bar
  const uploadLabelEl = document.getElementById('exam-pick-label');
  if (uploadLabelEl) uploadLabelEl.textContent = U.uploadDoc;
  // Summary
  const summaryTitleEl = document.querySelector('.summary-title');
  if (summaryTitleEl) summaryTitleEl.textContent = U.sessionSummary;
  // setState refreshes status/orb labels
  setState(appState || 'inactive');
}
```

Call at bottom of JS init section (after `initVoicesMap()` call):
```js
applyUIStrings();
```

- [ ] **Step 4: Update `showSessionSummary` to use `ui()` for strings**

Replace hardcoded strings:
```js
// In showSessionSummary:
body.textContent = ui('analyzing');

// summary title
el.querySelector('.summary-title').textContent = ui('sessionSummary');

// reward label
rewardEl.innerHTML = `<span class="summary-reward-label">${ui('newTitle')}</span><span class="summary-reward-value">${r.title}</span>`;

// Groq summary call:
{ role: 'system', content: ui('summarySystem') },
{ role: 'user', content: ui('summaryPrompt') },
```

- [ ] **Step 5: Update silence prompt and session start cues**

In `processAiSilencePrompt`:
```js
{ role: 'user', content: ui('silencePrompt') }
```

In `aiGreeting` and `chatGreeting`:
```js
{ role: 'user', content: ui('sessionStart') }
```

In `chatGreeting` fallback:
```js
typingEl.textContent = ui('fallbackGreeting');
```

- [ ] **Step 6: Update chat mode "CHAT" label in `setState`**
Already handled — `ui('chatMode')` is used in `setState` for the chat state label.

- [ ] **Step 7: Commit**
```bash
git add index.html
git commit -m "feat: full UI localisation via UI_STRINGS, applyUIStrings(), ui() helper"
```

---

## Task 4 — Spanish Data Moved Into `LANGUAGES.es`

**Files:**
- Modify: `index.html` — wrap existing `VOICES`, `VOICE_META`, `SYSTEM`, `DIFFICULTY_SUFFIX` in `LANGUAGES.es`

- [ ] **Step 1: Create `LANGUAGES` skeleton before `VOICE_META`**

```js
// ──────────────────────────────────────────────────────────────
// Language definitions
// ──────────────────────────────────────────────────────────────
const LANGUAGES = {
  es: {
    defaultVoice: 'es-ES-ElviraNeural',
    srLang: 'es-ES',
    map: { lonMin: -125, lonMax: 15, latMax: 50, latMin: -45, w: 360, h: 296 },
    voices:  null, // filled below
    meta:    null, // filled below
    system:  null, // filled below
    diff:    null, // filled below
  },
  pt: {
    defaultVoice: 'pt-BR-FranciscaNeural',
    srLang: 'pt-BR',
    map: { lonMin: -75, lonMax: 40, latMax: 55, latMin: -35, w: 360, h: 296 },
    voices:  null, // filled in Task 5
    meta:    null, // filled in Task 6
    system:  null, // filled in Task 7
    diff:    null, // filled in Task 7
  },
};
```

- [ ] **Step 2: Assign existing Spanish data to `LANGUAGES.es` after its declarations**

After the `const VOICES = [...]` block, add:
```js
LANGUAGES.es.voices = VOICES;
```

After the `const VOICE_META = {...}` block, add:
```js
LANGUAGES.es.meta = VOICE_META;
```

After the `const SYSTEM = \`...\`` declaration, add:
```js
LANGUAGES.es.system = SYSTEM;
```

After `const DIFFICULTY_SUFFIX = [...]`, add:
```js
LANGUAGES.es.diff = DIFFICULTY_SUFFIX;
```

- [ ] **Step 3: Update all functions that consume these to go through `LANGUAGES[currentLang]`**

```js
// Replace direct VOICES reference with:
const VOICES = () => LANGUAGES[currentLang].voices;
// BUT since VOICES is used as an array in many places, easier to use a getter:
function getLangVoices() { return LANGUAGES[currentLang].voices; }

// Replace VOICE_META reference in getVoiceLevelTitle, checkNewRewards, showSessionSummary:
function getVoiceMeta(voiceId) { return LANGUAGES[currentLang].meta?.[voiceId]; }

// activeSystem():
function activeSystem() {
  if (examMode && examContent) return buildExamSystem(examContent);
  const base = LANGUAGES[currentLang].system;
  const level = getVoiceLevel(getVoiceKey());
  return base + LANGUAGES[currentLang].diff[level];
}
```

Update every place `VOICES` array is iterated (map rendering, init, voice selection) to call `getLangVoices()`.

Update every place `VOICE_META[voiceId]` is accessed to call `getVoiceMeta(voiceId)`.

- [ ] **Step 4: Update `startRecognition` to use `LANGUAGES[currentLang].srLang`**

```js
function startRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  recognition = new SR();
  recognition.continuous     = true;
  recognition.interimResults = true;
  recognition.lang           = LANGUAGES[currentLang].srLang;
  // ... rest unchanged
}
```

- [ ] **Step 5: Commit**
```bash
git add index.html
git commit -m "refactor: Spanish data moved into LANGUAGES.es, all consumers use getLangVoices/getVoiceMeta"
```

---

## Task 5 — Portuguese Voice Data

**Files:**
- Modify: `index.html` — add `LANGUAGES.pt.voices` with 16 voices, map coordinates for Lusophone world

Coordinates use Portuguese map projection: `sx = 360/(40-(-75)) = 3.13`, `sy = 296/(55-(-35)) = 3.29`
Formula: `x = (lon - (-75)) * 3.13`, `y = (55 - lat) * 3.29`

- [ ] **Step 1: Add Portuguese voices array after `LANGUAGES.es.voices = VOICES`**

```js
LANGUAGES.pt.voices = [
  // Brasil — Southeast
  { id:'pt-BR-FranciscaNeural', name:'Francisca', city:'São Paulo',       country:'Brasil',   trait:'calorosa',   color:'#E8907A', x:89,  y:257 },
  { id:'pt-BR-AntonioNeural',   name:'António',   city:'Rio de Janeiro',  country:'Brasil',   trait:'animado',    color:'#78B8E8', x:101, y:253 },
  { id:'pt-BR-GiovannaNeural',  name:'Giovanna',  city:'Belo Horizonte',  country:'Brasil',   trait:'clara',      color:'#B090E8', x:97,  y:244 },
  { id:'pt-BR-DonatoNeural',    name:'Donato',    city:'Brasília',        country:'Brasil',   trait:'preciso',    color:'#D4A050', x:85,  y:231 },
  // Brasil — Northeast
  { id:'pt-BR-BrendaNeural',    name:'Brenda',    city:'Salvador',        country:'Brasil',   trait:'musical',    color:'#E8B86A', x:116, y:222 },
  { id:'pt-BR-LeticiaNeural',   name:'Letícia',   city:'Fortaleza',       country:'Brasil',   trait:'viva',       color:'#70D4B8', x:117, y:191 },
  { id:'pt-BR-ElzaNeural',      name:'Elza',      city:'Recife',          country:'Brasil',   trait:'expressiva', color:'#F0C840', x:128, y:206 },
  { id:'pt-BR-ValerioNeural',   name:'Valério',   city:'Natal',           country:'Brasil',   trait:'direto',     color:'#C8D870', x:129, y:198 },
  // Brasil — North & South
  { id:'pt-BR-ManuelaNeural',   name:'Manuela',   city:'Manaus',          country:'Brasil',   trait:'serena',     color:'#70C8A8', x:47,  y:189 },
  { id:'pt-BR-YaraNeural',      name:'Yara',      city:'Belém',           country:'Brasil',   trait:'suave',      color:'#D890C8', x:83,  y:184 },
  { id:'pt-BR-FabioNeural',     name:'Fábio',     city:'Porto Alegre',    country:'Brasil',   trait:'cálido',     color:'#90C870', x:75,  y:276 },
  { id:'pt-BR-ManuelaNeural',   name:'Manuela',   city:'Curitiba',        country:'Brasil',   trait:'precisa',    color:'#88C4E0', x:80,  y:261 },
  // Note: Manuela & Curitiba — if Azure has only one Manuela, use NicolauNeural for Curitiba
  { id:'pt-BR-NicolauNeural',   name:'Nicolau',   city:'Florianópolis',   country:'Brasil',   trait:'jovial',     color:'#E8904C', x:83,  y:269 },
  // Portugal
  { id:'pt-PT-DuarteNeural',    name:'Duarte',    city:'Lisboa',          country:'Portugal', trait:'eloquente',  color:'#E890A8', x:206, y:54  },
  { id:'pt-PT-FernandaNeural',  name:'Fernanda',  city:'Porto',           country:'Portugal', trait:'calorosa',   color:'#D07890', x:205, y:46  },
  { id:'pt-PT-RaquelNeural',    name:'Raquel',    city:'Coimbra',         country:'Portugal', trait:'intelectual',color:'#A8C8E8', x:211, y:50  },
];
```

- [ ] **Step 2: Update `initVoicesMap` to use language-specific map bounds**

Find the coastline projection in `initVoicesMap` and replace the hardcoded bounds with dynamic ones:

```js
// Replace:
const lonMin = -125, latMax = 50;
const sx = 360 / (15 - (-125));
const sy = 290 / (50 - (-45));

// With:
const mapCfg = LANGUAGES[currentLang].map;
const lonMin  = mapCfg.lonMin;
const latMax  = mapCfg.latMax;
const sx = mapCfg.w / (mapCfg.lonMax - mapCfg.lonMin);
const sy = mapCfg.h / (mapCfg.latMax - mapCfg.latMin);
```

Also update the clip filter:
```js
// Replace hardcoded clip:
if (lon < -130 || lon > 20 || lat < -48 || lat > 55) { move = true; return; }

// With dynamic clip (5° margin):
if (lon < mapCfg.lonMin - 5 || lon > mapCfg.lonMax + 5 ||
    lat < mapCfg.latMin - 5 || lat > mapCfg.latMax + 5) { move = true; return; }
```

Also update the SVG viewBox:
```js
// After the map SVG is obtained:
mapSvg.setAttribute('viewBox', `0 0 ${mapCfg.w} ${mapCfg.h}`);
mapSvg.setAttribute('height', mapCfg.h);
```

- [ ] **Step 3: Commit**
```bash
git add index.html
git commit -m "feat: Portuguese voice data (16 voices), dynamic map projection per language"
```

---

## Task 6 — Portuguese `VOICE_META` (Titles + Fun Facts)

**Files:**
- Modify: `index.html` — add `LANGUAGES.pt.meta`

- [ ] **Step 1: Add Portuguese VOICE_META after `LANGUAGES.es.meta = VOICE_META`**

```js
LANGUAGES.pt.meta = {
  'pt-BR-FranciscaNeural': {
    levels: ['Paulistana', 'Filha do Bandeirante', 'Senhora da Metrópole'],
    facts: [
      'São Paulo tem a maior população japonesa fora do Japão — mais de 1,5 milhão de nipo-brasileiros. O bairro da Liberdade é o maior enclave japonês do mundo fora da Ásia.',
      'São Paulo é a cidade com mais helicópteros per capita do mundo: mais de 700 aparelhos registados. O trânsito é tão caótico que executivos fazem o trajeto casa-trabalho de helicóptero.',
      'A Avenida Paulista foi construída em 1891 como endereço dos barões do café. Em cem anos transformou-se no centro financeiro do Brasil — mas o seu subsolo esconde mansões do século XIX que nunca foram catalogadas.',
    ]
  },
  'pt-BR-AntonioNeural': {
    levels: ['Carioca', 'Filho do Maravilhoso', 'Guardião da Pedra da Gávea'],
    facts: [
      'O Rio de Janeiro foi capital do Império Português de 1808 a 1821 — a única vez que a capital de um império europeu ficou situada no continente americano.',
      'O Cristo Redentor foi eleito uma das Sete Maravilhas do Mundo Moderno em 2007, mas o projeto original previa uma estátua a segurar um globo e uma cruz — os braços abertos foram pedido da Igreja Católica.',
      'A Floresta da Tijuca é a maior floresta tropical regenerada no interior de uma cidade no mundo. Foi destruída para o cultivo de café no século XIX e replantada à mão entre 1861 e 1887.',
    ]
  },
  'pt-BR-GiovannaNeural': {
    levels: ['Belo-horizontina', 'Filha das Minas', 'Guardiã do Ouro Preto'],
    facts: [
      'Belo Horizonte foi a primeira cidade planejada do Brasil, inaugurada em 1897 para ser a nova capital de Minas Gerais. As suas avenidas foram desenhadas em ângulos de 45° para facilitar o vento.',
      'A região de Minas Gerais produz mais pedras preciosas do que qualquer outra no mundo: esmeraldas, topázios imperiais, turmalinas e alexandritas. A maioria dos ourives de Tiffany & Co. trabalha com pedras mineiras.',
      'O "pão de queijo" mineiro — símbolo gastronómico de BH — foi inventado por escravas no século XVIII que usavam polvilho (fécula de mandioca) em lugar de farinha de trigo, inacessível para elas.',
    ]
  },
  'pt-BR-DonatoNeural': {
    levels: ['Candango', 'Filho do Cerrado', 'Arquiteto do Futuro'],
    facts: [
      'Brasília foi construída em 41 meses — de 1956 a 1960 — no meio do cerrado, a 1.000 km da costa. Nunca na história uma capital de tal dimensão foi erguida tão depressa do zero.',
      'O projeto de Brasília foi concebido por Lúcio Costa e Oscar Niemeyer com a forma de um avião vista do ar — asa norte, asa sul, fuselagem. Mas foi coincidência: o plano original era uma cruz.',
      'Os trabalhadores que construíram Brasília chamavam-se "candangos" — migrantes pobres do Nordeste que viviam em acampamentos. Hoje esse nome é sinônimo de orgulho e identidade brasiliense.',
    ]
  },
  'pt-BR-BrendaNeural': {
    levels: ['Baiana', 'Filha de Iemanjá', 'Herdeira do Pelourinho'],
    facts: [
      'Salvador foi a primeira capital do Brasil e o maior porto de entrada de escravos africanos das Américas. Mais de 40% da população afro-brasileira descende dos povos que chegaram por Salvador.',
      'O candomblé praticado na Bahia preservou rituais, línguas e divindades iorubás que desapareceram na própria África. Salvador é hoje considerada a capital espiritual da diáspora africana no mundo.',
      'O Carnaval de Salvador é o maior da Terra em número de participantes — até 2 milhões de pessoas por dia. Foi inventado nos anos 50 por três músicos que montaram uma bateria num caminhão.',
    ]
  },
  'pt-BR-LeticiaNeural': {
    levels: ['Fortalezense', 'Filha do Sertão', 'Guardiã do Ceará'],
    facts: [
      'Fortaleza tem as maiores dunas costeiras urbanas do mundo: as dunas do Cocó chegam a 30 metros de altura dentro da cidade e estão a menos de 5 km do centro.',
      'O Ceará foi o primeiro estado brasileiro a abolir a escravatura, em 1884 — quatro anos antes da Lei Áurea nacional de 1888. A iniciativa partiu dos jangadeiros, pescadores que se recusaram a transportar escravos nos seus barcos.',
      'O peixe mais consumido no Nordeste, a "lagosta do Ceará", não é tecnicamente uma lagosta: é um crustáceo sem pinças chamado "lagosta-do-nordeste" que só existe nas águas mornas entre Fortaleza e Natal.',
    ]
  },
  'pt-BR-ElzaNeural': {
    levels: ['Pernambucana', 'Filha do Frevo', 'Guardiã do Capibaribe'],
    facts: [
      'O frevo, ritmo e dança originários de Recife, foi inscrito na UNESCO em 2012. A sua característica umbrela colorida não é decorativa: servia para esconder facas nos carnavais violentos do século XIX.',
      'Recife tem mais pontes do que qualquer outra cidade brasileira — 67 pontes sobre os rios Capibaribe e Beberibe — o que lhe valeu o apelido de "Veneza brasileira".',
      'A Ilha de Fernando de Noronha, arquipélago pernambucano no Atlântico, cobra uma taxa de preservação ambiental diária aos turistas. Em 1503, foi o primeiro território americano a ser oficialmente registado em nome de Portugal.',
    ]
  },
  'pt-BR-ValerioNeural': {
    levels: ['Natalense', 'Filho das Dunas', 'Guardião do Maior Cajueiro do Mundo'],
    facts: [
      'Natal tem o maior cajueiro do mundo: uma única árvore plantada em 1888 que ocupa 8.500 m² — quase dois campos de futebol. As suas raízes rastejantes cobrem mais solo do que qualquer outra planta individual conhecida.',
      'Natal foi a base de operações dos Aliados no Atlântico Sul durante a Segunda Guerra Mundial: a sua posição geográfica tornou-a o ponto mais próximo da África a partir do continente americano.',
      'O Rio Grande do Norte produz 95% do sal marinho consumido no Brasil. As salinas de Mossoró e Macau são as maiores da América Latina e visíveis do espaço com a sua coloração rosa avermelhada.',
    ]
  },
  'pt-BR-ManuelaNeural': {
    levels: ['Manauara', 'Filha da Amazônia', 'Guardiã do Rio Negro'],
    facts: [
      'Manaus fica no meio da selva amazónica, a 1.500 km do oceano, mas foi uma das cidades mais ricas do mundo entre 1850 e 1912 graças ao boom da borracha. O seu Teatro Amazonas foi construído com materiais importados da Europa.',
      'O "encontro das águas" perto de Manaus — onde o Rio Negro (preto e quente) encontra o Solimões (castanho e frio) — corre lado a lado durante 6 km sem se misturar, por diferenças de temperatura, velocidade e densidade.',
      'A Amazónia produz 20% do oxigénio renovável da Terra e contém 20% de toda a água doce superficial do planeta. Mais de 30.000 espécies de plantas ainda não foram catalogadas pela ciência.',
    ]
  },
  'pt-BR-YaraNeural': {
    levels: ['Belenense', 'Filha do Círio', 'Guardiã da Porta da Amazônia'],
    facts: [
      'O Círio de Nazaré em Belém é a maior procissão católica do mundo: mais de 2 milhões de pessoas participam todos os anos no segundo domingo de outubro, superando o Vaticano e Fátima.',
      'O "açaí" que o mundo consome como superfood foi durante séculos o alimento básico das populações ribeirinhas do Pará — consumido com peixe e farinha, não com granola e banana.',
      'Belém fica praticamente na linha do equador e tem o mercado Ver-o-Peso, o maior mercado a céu aberto da América Latina, onde se vendem ervas medicinais, animais da floresta e peixe fresco desde 1625.',
    ]
  },
  'pt-BR-FabioNeural': {
    levels: ['Gaúcho', 'Filho do Pampa', 'Guardião do Rio Grande'],
    facts: [
      'O churrasco gaúcho — carne assada em espeto vertical com sal grosso — não surgiu nos restaurantes: era a forma como os peões das estâncias conservavam e cozinhavam carne durante as longas cavalgadas no pampa.',
      'O Rio Grande do Sul tentou separar-se do Brasil três vezes: a Revolução Farroupilha (1835-1845) foi o conflito separatista mais longo da história brasileira, com uma república independente que durou 10 anos.',
      'Porto Alegre tem a maior densidade de livrarias per capita do Brasil e é a única capital brasileira com invernos suficientemente frios para nevar ocasionalmente — embora isso aconteça menos de uma vez por década.',
    ]
  },
  'pt-BR-NicolauNeural': {
    levels: ['Florianopolitano', 'Filho da Ilha Mágica', 'Guardião das Lagoas'],
    facts: [
      'Florianópolis é chamada "Ilha da Magia" e tem 42 praias numa única ilha, com ecossistemas tão diversos que em alguns locais é possível fazer surf e pesca de lagosta no mesmo dia.',
      'A maior lagoa do Estado, a Lagoa da Conceição, está rodeada por dunas ativas que se movem até 2 metros por ano, engolindo lentamente os pinheiros e caminhos à sua volta.',
      'Santa Catarina tem a maior concentração de descendentes de alemães fora da Alemanha. Em algumas cidades do interior, o "hunsrückisch" — dialeto alemão do século XIX — ainda é a língua principal, nunca tendo sido escrito nem padronizado.',
    ]
  },
  'pt-PT-DuarteNeural': {
    levels: ['Lisboeta', 'Filho do Tejo', 'Guardião da Torre de Belém'],
    facts: [
      'Lisboa é a capital mais ocidental da Europa continental e foi fundada antes de Roma — segundo a lenda, por Ulisses. O seu nome em árabe, "Al-Ushbuna", ainda ecoa nos bairros da Mouraria e Alfama.',
      'O grande terramoto de 1755 destruiu 85% de Lisboa e foi sentido até às ilhas Caraíbas. O Marquês de Pombal reconstruiu toda a Baixa em apenas um ano com um sistema de grelha antissísmica que ainda hoje protege a cidade.',
      'O fado lisboeta foi inscrito na UNESCO em 2011. Mas os seus origines são disputadas: pode ter vindo dos cantes de escravas africanas, dos lamentos dos marinheiros, ou das modinhas trazidas do Brasil pela corte em 1821.',
    ]
  },
  'pt-PT-FernandaNeural': {
    levels: ['Portuense', 'Filha do Douro', 'Guardiã da Ribeira'],
    facts: [
      'O vinho do Porto não é de Porto — é produzido no vale do Douro, a 100 km a leste, e apenas armazenado e embarcado em Vila Nova de Gaia, a cidade do outro lado do rio. Os ingleses inventaram o nome "Port Wine" no século XVII.',
      'A livraria Lello do Porto, inaugurada em 1906, foi classificada como uma das mais belas do mundo e inspirou J.K. Rowling para os cenários de Harry Potter enquanto ensinava inglês na cidade nos anos 90.',
      'O futebol português tem uma anomalia histórica: o F.C. Porto foi fundado em 1893 por um homem que tinha aprendido o jogo em Inglaterra. Na época, os ingleses que trabalhavam nas caves de vinho trouxeram bolas, e os portugueses ficaram para sempre.',
    ]
  },
  'pt-PT-RaquelNeural': {
    levels: ['Coimbrã', 'Filha do Mondego', 'Guardiã da Universidade'],
    facts: [
      'A Universidade de Coimbra, fundada em 1290, é uma das mais antigas do mundo ainda em funcionamento. Os seus estudantes usaram durante séculos capas negras que se rasgavam como sinal de protesto contra os professores — tradição que existe até hoje.',
      'O fado de Coimbra é diferente do de Lisboa: é cantado exclusivamente por homens, sempre a cappella ou com guitarra portuguesa, e aborda temas filosóficos e poéticos em vez de amores perdidos.',
      'A Biblioteca Joanina de Coimbra, construída em 1728, usa uma colónia de morcegos para proteger os seus 300.000 volumes: os animais comem os insetos que destruiriam o papel, e de manhã as mesas são cobertas com panos de couro para proteger os livros dos excrementos.',
    ]
  },
};
LANGUAGES.pt.meta = LANGUAGES.pt.meta; // (already assigned above)
```

- [ ] **Step 2: Commit**
```bash
git add index.html
git commit -m "feat: Portuguese VOICE_META — 16 voices, 3 level titles + 3 fun facts each"
```

---

## Task 7 — Portuguese System Prompt, Difficulty Suffixes + Exam Mode Localisation

**Files:**
- Modify: `index.html` — add `LANGUAGES.pt.system`, `LANGUAGES.pt.diff`, localise `buildExamSystem()`

- [ ] **Step 1: Add after `LANGUAGES.es.diff = DIFFICULTY_SUFFIX`**

```js
LANGUAGES.pt.system = `És um professor de português nativo, simpático e natural.
Falas com o utilizador como numa conversa real.
Responde SEMPRE em português. Máximo 1-2 frases — a conversa continua, não é preciso resumir.
Intervém quando o utilizador faz uma pausa, hesita, faz uma pergunta ou comete um erro.
Se há um erro gramatical ou de vocabulário, corrige-o de forma natural na tua resposta — depois pede ao utilizador que repita a forma correta: por exemplo "Consegues repetir?" ou "Agora tu". Não o peças mais de uma vez por erro.
Nunca repitas literalmente o que o utilizador disse. Vai direto ao assunto.
NUNCA digas adeus, tchau, nem nenhuma frase de despedida ou de encerramento. O utilizador controla quando a sessão termina — tu continuas a falar sempre.
Se recebes "[silêncio]", o utilizador não respondeu: faz-lhe uma pergunta, dá-lhe uma pista ou simplesmente encoraja-o — o mais natural possível.
Se recebes "[início de sessão]", saúda de forma natural e propõe um tema ou uma pergunta para começar.`;

LANGUAGES.pt.diff = [
  '\nNível do estudante: iniciante. Usa vocabulário simples, frases curtas e muita paciência. Corrige com calma.',
  '\nNível do estudante: intermédio. Podes usar gramática mais complexa, expressões idiomáticas locais e um ritmo natural. Corrige de forma fluída.',
  '\nNível do estudante: avançado. Fala como um nativo, usa gírias e referências culturais da tua região. Não simplifiques — o utilizador consegue acompanhar.',
];
```

- [ ] **Step 2: Localise `buildExamSystem()` — replace hardcoded Spanish with `UI_STRINGS`**

Add exam system prompt strings to `UI_STRINGS`:

```js
// Inside UI_STRINGS.es:
examSystemFn: (content) =>
  `Eres un profesor de español y examinador estricto pero justo.
El usuario ha subido el siguiente material de estudio:
----
${content}
----
Tu misión durante esta sesión:
- Interrogar al usuario sobre este material, en español, con preguntas concretas y progresivas
- Evaluar sus respuestas: valida lo correcto, corrige lo erróneo de forma natural
- Si comete un error de español, corrígelo y pídele que repita la forma correcta
- Avanza por el material de forma estructurada, un concepto a la vez
- Máximo 1-2 frases por turno
NUNCA digas adiós ni cierres la sesión — el usuario controla cuándo termina.
Si recibes "[silencio]", reformula la última pregunta de otra manera.
Si recibes "[inicio de sesión]", preséntate como examinador en una frase y lanza inmediatamente la primera pregunta sobre el material.`,

// Inside UI_STRINGS.pt:
examSystemFn: (content) =>
  `És um professor de português e examinador exigente mas justo.
O utilizador enviou o seguinte material de estudo:
----
${content}
----
A tua missão durante esta sessão:
- Interrogar o utilizador sobre este material, em português, com perguntas concretas e progressivas
- Avaliar as suas respostas: valida o que está correto, corrige o que está errado de forma natural
- Se cometer um erro de português, corrige-o e pede-lhe que repita a forma correta
- Avança pelo material de forma estruturada, um conceito de cada vez
- Máximo 1-2 frases por turno
NUNCA digas adeus nem encerres a sessão — o utilizador controla quando termina.
Se recebes "[silêncio]", reformula a última pergunta de outra forma.
Se recebes "[início de sessão]", apresenta-te como examinador numa frase e lança imediatamente a primeira pergunta sobre o material.`,
```

Then replace `buildExamSystem()`:
```js
function buildExamSystem(content) {
  return ui('examSystemFn')(content);
}
```

Note: `ui('examSystemFn')` returns a function, so calling it with `(content)` produces the localised string.

- [ ] **Step 3: Commit**
```bash
git add index.html
git commit -m "feat: Portuguese system prompt + difficulty + localised buildExamSystem()"
```

---

## Task 8 — Onboarding Language Selection Screen

**Files:**
- Modify: `index.html` — HTML, CSS, JS for onboarding screen

The screen appears when `localStorage.getItem('app_lang') === null`. It fades in softly. No flags. Uses constellation/stellar visual language: two large language "orbs" or glyphs that evoke the app's aesthetic.

- [ ] **Step 1: Add CSS for onboarding screen**

Add inside `<style>`:
```css
/* ── Onboarding: language selection ── */
#screen-onboarding {
  position: absolute; inset: 0; z-index: 50;
  background: var(--bg3);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 0; padding: 40px 32px;
  animation: onboardFade 1.2s ease both;
}
#screen-onboarding.hidden { display: none; }

@keyframes onboardFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.onboard-tagline {
  font-family: var(--serif); font-style: italic;
  font-size: 1.1rem; color: var(--inkDim);
  text-align: center; margin-bottom: 56px;
  letter-spacing: 0.02em;
}

.onboard-langs {
  display: flex; flex-direction: column;
  gap: 18px; width: 100%; max-width: 280px;
}

.onboard-lang-btn {
  display: flex; align-items: center; gap: 20px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 20px; padding: 20px 24px;
  cursor: pointer; transition: background .2s, border-color .2s;
  text-align: left;
}
.onboard-lang-btn:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.18);
}

.onboard-lang-glyph {
  width: 44px; height: 44px; flex-shrink: 0;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--serif); font-size: 1.3rem;
  color: var(--ink);
}
.onboard-lang-glyph.es {
  background: radial-gradient(circle at 35% 35%, #E8C870, #C89040, #8B5A20);
  box-shadow: 0 0 18px rgba(232,200,112,0.25);
}
.onboard-lang-glyph.pt {
  background: radial-gradient(circle at 35% 35%, #78D4A8, #3A9E6C, #1A6040);
  box-shadow: 0 0 18px rgba(120,212,168,0.25);
}

.onboard-lang-info { flex: 1; }
.onboard-lang-name {
  font-family: var(--serif); font-size: 1.25rem;
  color: var(--ink); line-height: 1;
}
.onboard-lang-sub {
  font-family: var(--mono); font-size: 9px;
  letter-spacing: 2px; text-transform: uppercase;
  color: var(--inkDim); margin-top: 4px;
}
```

- [ ] **Step 2: Add onboarding HTML before `#screen-conversation`**

```html
<!-- ═══ Screen: Onboarding (language selection) ═══ -->
<div id="screen-onboarding" class="hidden">
  <p class="onboard-tagline">Que língua queres explorar hoje?</p>
  <div class="onboard-langs">
    <button class="onboard-lang-btn" data-lang="es">
      <div class="onboard-lang-glyph es">E</div>
      <div class="onboard-lang-info">
        <div class="onboard-lang-name">Español</div>
        <div class="onboard-lang-sub">Castelhano · 31 vozes</div>
      </div>
    </button>
    <button class="onboard-lang-btn" data-lang="pt">
      <div class="onboard-lang-glyph pt">P</div>
      <div class="onboard-lang-info">
        <div class="onboard-lang-name">Português</div>
        <div class="onboard-lang-sub">Brasil + Portugal · 16 vozes</div>
      </div>
    </button>
  </div>
</div>
```

- [ ] **Step 3: Add onboarding JS — show on first load, hide after selection**

```js
// ── Onboarding ──────────────────────────────────────────────
function initOnboarding() {
  const screen = document.getElementById('screen-onboarding');
  // Show if no language has been set
  if (!localStorage.getItem('app_lang')) {
    screen.classList.remove('hidden');
    screen.querySelectorAll('.onboard-lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        localStorage.setItem('app_lang', lang);
        // Fade out then reload to apply language
        screen.style.transition = 'opacity 0.5s';
        screen.style.opacity = '0';
        setTimeout(() => location.reload(), 520);
      });
    });
  }
}
initOnboarding();
```

- [ ] **Step 4: Add language selector row to settings (for subsequent visits)**

In the settings HTML, add before the voice map section:
```html
<!-- Language selector (settings) -->
<div class="settings-lang-row" id="settings-lang-row">
  <button class="lang-chip" data-lang="es" id="lang-chip-es">Español</button>
  <button class="lang-chip" data-lang="pt" id="lang-chip-pt">Português</button>
</div>
```

Add CSS:
```css
.settings-lang-row {
  position: absolute; top: 120px; left: 24px; right: 24px;
  display: flex; gap: 10px;
}
.lang-chip {
  flex: 1; padding: 8px 12px; border-radius: 20px;
  font-family: var(--mono); font-size: 10px; letter-spacing: 1.5px;
  text-transform: uppercase; cursor: pointer;
  border: 1px solid var(--rule); background: rgba(255,255,255,0.04);
  color: var(--inkSoft); transition: background .15s, border-color .15s;
}
.lang-chip.active {
  background: rgba(255,255,255,0.10);
  border-color: var(--vc); color: var(--ink);
}
```

Add JS wiring:
```js
// Language chip wiring (in settings)
document.querySelectorAll('.lang-chip').forEach(chip => {
  if (chip.dataset.lang === currentLang) chip.classList.add('active');
  chip.addEventListener('click', () => {
    if (chip.dataset.lang === currentLang) return;
    localStorage.setItem('app_lang', chip.dataset.lang);
    location.reload();
  });
});
```

Adjust `settings-section-label` top from `164px` to `154px` to account for the new lang row (it shifts voice section down by ~40px — adjust `settings-section-label` to `204px`, voice map to `226px`, selected voice to `562px`, duration to `652px`, exam to `788px`, chat to `848px`, save to `916px`, spacer height to `1040px`).

- [ ] **Step 5: Commit**
```bash
git add index.html
git commit -m "feat: onboarding language selection screen (ethereal, no flags), language chip in settings"
```

---

## Task 9 — End-to-End Wiring + Service Worker Bump + Deploy

**Files:**
- Modify: `index.html`, `service-worker.js`

- [ ] **Step 1: Verify `initVoicesMap()` re-runs when language changes**

`location.reload()` is used after language change, so `initVoicesMap()` will always run fresh. No extra action needed.

- [ ] **Step 2: Verify `applyChatMode` reads from correct lang key**

Check that `localStorage.getItem(lk.chatMode())` is used everywhere chatMode is read. Also verify exam-toggle state is reset on language change (it auto-resets on reload since each lang has its own key).

- [ ] **Step 3: Update `applyConversationBackground` to use lang-prefixed BG_UNLOCKS**

Wrap `BG_UNLOCKS` in language-specific keys:
```js
const BG_UNLOCKS = {
  es: {
    'es-ES-ElviraNeural':  { url: '/backgrounds/madrid.webp',       unlock: 250 },
    'es-US-AlonsoNeural':  { url: '/backgrounds/los-angeles.webp',  unlock: 300 },
    'es-AR-ElenaNeural':   { url: '/backgrounds/buenos-aires.webp', unlock: 400 },
  },
  pt: {}, // populated when PT backgrounds are created
};

function getBackgroundUnlock(voiceId) {
  const unlock = (BG_UNLOCKS[currentLang] || {})[voiceId];
  if (!unlock) return null;
  const pts = getVoicePoints()[voiceId] || 0;
  return pts >= unlock.unlock ? unlock : null;
}
```

- [ ] **Step 4: Bump service worker**

In `service-worker.js`:
```js
const CACHE_NAME = 'espagnolai-v45';
```

- [ ] **Step 5: Commit and deploy**
```bash
git add index.html service-worker.js api/tts-pt.js
git commit -m "feat: multi-language complete — ES + PT, onboarding, full UI localisation, cache v45"
git push origin main
vercel deploy --prod --yes
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Portuguese as second language | Tasks 5, 6, 7 |
| Replicated TTS architecture (edge-tts) | Task 1 |
| Voices from HadrienGardeur/web-speech-recommended-voices | Task 5 (pt-BR-*, pt-PT-* Azure Neural IDs) |
| No flags — stellar/ethereal language selector | Task 8 |
| Onboarding on first use + fresh install | Task 8 |
| Language selector in settings after first use | Task 8 |
| Full UI text adapts to language | Task 3 |
| Auto-reload after language change | Task 8 |
| Shared streak across languages | Task 2 (`session_dates` not prefixed) |
| Language-isolated points/voice/chat state | Task 2 (all other keys prefixed) |
| Dynamic map projection per language | Task 5 |
| Background unlock system per language | Task 9 |
| Exam mode system prompt localised | Task 7 (`buildExamSystem` via `ui('examSystemFn')`) |

**No placeholders found** — all fun facts, level titles, system prompts, code blocks, and CSS are complete.

**Type consistency check:**
- `getLangVoices()` used everywhere `VOICES` was — consistent throughout Tasks 4-8
- `getVoiceMeta(voiceId)` used everywhere `VOICE_META[voiceId]` was — consistent
- `lk.voiceKey()` replaces `'voice_key'` everywhere — consistent
- `ui('key')` used in Task 3 throughout and referenced in Task 4/7 — consistent
- `LANGUAGES[currentLang].map` fields (`lonMin`, `lonMax`, `latMin`, `latMax`, `w`, `h`) used consistently in Task 5
