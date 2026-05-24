// === State (declared early — used across multiple tasks) ===
let isOralMode = false;
let pendingCorrections = [];
function setWaveState() {} // stub — real impl below

// === Configuration ===
const CONFIG = {
  ollamaUrl: 'http://localhost:11434',
  model: 'llama3.1:8b',
  historyLimit: 10,
};

const SYSTEM_PROMPT = `Eres un hablante nativo de español. Habla ÚNICAMENTE en español, sin excepción.
Responde de forma natural y conversacional.
Después de cada mensaje del usuario, analiza sus errores gramaticales o de vocabulario
y devuelve tu respuesta en este formato JSON exacto:
{"reply":"tu respuesta natural aquí","corrections":[{"original":"lo que dijo el usuario","corrected":"la forma correcta","explanation":"breve explicación en español"}]}
Si no hay errores, devuelve corrections como array vacío [].
IMPORTANTE: devuelve SOLO el JSON, sin texto adicional antes o después.`;

// === Conversation history ===
let history = [];

function addToHistory(role, content) {
  history.push({ role, content });
  if (history.length > CONFIG.historyLimit * 2) {
    history = history.slice(-CONFIG.historyLimit * 2);
  }
}

// === Ollama API ===
async function checkOllamaStatus() {
  try {
    const res = await fetch(`${CONFIG.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendToOllama(userMessage) {
  addToHistory('user', userMessage);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
  ];
  const res = await fetch(`${CONFIG.ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: CONFIG.model, messages, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  const raw = data.message?.content ?? '';
  addToHistory('assistant', raw);
  return parseOllamaResponse(raw);
}

function parseOllamaResponse(raw) {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('no JSON found');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      reply: parsed.reply ?? raw,
      corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
    };
  } catch {
    return { reply: raw, corrections: [] };
  }
}

// === Status indicator ===
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

async function updateStatus() {
  const online = await checkOllamaStatus();
  statusDot.className = online ? 'online' : 'offline';
  statusText.textContent = online ? 'En ligne' : 'Ollama hors ligne';
  return online;
}

setInterval(updateStatus, 15000);

// === Chat UI ===
const chatMessages = document.getElementById('chat-messages');

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCorrections(corrections) {
  if (!corrections.length) return '';
  const items = corrections.map(c => `
    <div class="correction-item">
      <span class="correction-original">${escapeHtml(c.original)}</span>
      <span class="correction-arrow">→</span>
      <span class="correction-corrected">${escapeHtml(c.corrected)}</span>
      <div class="correction-explanation">${escapeHtml(c.explanation)}</div>
    </div>
  `).join('');
  return `
    <div class="corrections-block">
      <button class="corrections-toggle" onclick="toggleCorrections(this)">
        ✔ ${corrections.length} corrección${corrections.length > 1 ? 'es' : ''}
      </button>
      <div class="corrections-list hidden">${items}</div>
    </div>
  `;
}

function toggleCorrections(btn) {
  const list = btn.nextElementSibling;
  list.classList.toggle('hidden');
  btn.textContent = list.classList.contains('hidden')
    ? `✔ ${list.children.length} corrección${list.children.length > 1 ? 'es' : ''}`
    : '▲ Ocultar correcciones';
}

function appendUserMessage(text, corrections) {
  const div = document.createElement('div');
  div.className = 'message user';
  div.innerHTML = `
    <span class="message-label">Tú</span>
    <div class="bubble">${escapeHtml(text)}</div>
    ${renderCorrections(corrections)}
  `;
  chatMessages.appendChild(div);
  scrollToBottom();
}

function appendAiMessage(text) {
  const div = document.createElement('div');
  div.className = 'message ai';
  div.innerHTML = `
    <span class="message-label">EspañolAI</span>
    <div class="bubble">${escapeHtml(text)}</div>
  `;
  chatMessages.appendChild(div);
  scrollToBottom();
  return div;
}

function appendThinkingIndicator() {
  const div = document.createElement('div');
  div.className = 'message ai';
  div.id = 'thinking';
  div.innerHTML = `<div class="bubble" style="color:var(--text-muted)">...</div>`;
  chatMessages.appendChild(div);
  scrollToBottom();
  return div;
}

// === TTS ===
let ttsVoice = null;

function loadSpanishVoice() {
  const voices = speechSynthesis.getVoices();
  ttsVoice =
    voices.find(v => v.lang === 'es-ES') ||
    voices.find(v => v.lang === 'es-MX') ||
    voices.find(v => v.lang.startsWith('es')) ||
    null;
}

speechSynthesis.addEventListener('voiceschanged', loadSpanishVoice);
loadSpanishVoice();

function speak(text, { onStart, onEnd } = {}) {
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'es-ES';
  utter.rate = 0.95;
  utter.pitch = 1;
  if (ttsVoice) utter.voice = ttsVoice;
  if (onStart) utter.onstart = onStart;
  if (onEnd) utter.onend = onEnd;
  speechSynthesis.speak(utter);
}

function stopSpeaking() {
  speechSynthesis.cancel();
}

// === STT ===
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

function initSTT(onResult, onError) {
  if (!SpeechRecognition) {
    console.warn('Web Speech API non supportée dans ce navigateur.');
    return null;
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    onResult(transcript);
  };
  recognition.onerror = (e) => {
    isListening = false;
    onError(e.error);
  };
  recognition.onend = () => {
    isListening = false;
  };
  return recognition;
}

function startListening() {
  if (!recognition || isListening) return;
  stopSpeaking();
  isListening = true;
  recognition.start();
}

function stopListening() {
  if (!recognition || !isListening) return;
  recognition.stop();
  isListening = false;
}

// === Core interaction ===
let isProcessing = false;

async function handleUserInput(text) {
  if (!text.trim() || isProcessing) return;
  isProcessing = true;

  const thinkingEl = appendThinkingIndicator();

  try {
    const { reply, corrections } = await sendToOllama(text);
    thinkingEl.remove();

    if (isOralMode) {
      pendingCorrections.push(...corrections);
      updateCorrectionsCount();
      setWaveState('speaking');
      speak(reply, {
        onEnd: () => setWaveState('idle'),
      });
    } else {
      appendUserMessage(text, corrections);
      appendAiMessage(reply);
      speak(reply);
    }
  } catch (err) {
    thinkingEl.remove();
    appendAiMessage(`[Error: ${err.message}]`);
  } finally {
    isProcessing = false;
  }
}

// === UI controls — text mode ===
const micBtn = document.getElementById('mic-btn');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const newConvBtn = document.getElementById('new-conversation-btn');

initSTT(
  (transcript) => {
    micBtn.classList.remove('listening');
    oralMicBtn.classList.remove('listening');
    handleUserInput(transcript);
  },
  (err) => {
    micBtn.classList.remove('listening');
    oralMicBtn.classList.remove('listening');
    console.warn('STT error:', err);
  }
);

micBtn.addEventListener('mousedown', () => { micBtn.classList.add('listening'); startListening(); });
micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); micBtn.classList.add('listening'); startListening(); }, { passive: false });
micBtn.addEventListener('mouseup', () => stopListening());
micBtn.addEventListener('touchend', () => stopListening());

sendBtn.addEventListener('click', () => {
  const val = textInput.value.trim();
  if (!val) return;
  textInput.value = '';
  handleUserInput(val);
});

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const val = textInput.value.trim();
    if (!val) return;
    textInput.value = '';
    handleUserInput(val);
  }
});

newConvBtn.addEventListener('click', () => {
  history = [];
  pendingCorrections = [];
  chatMessages.innerHTML = '';
  updateCorrectionsCount();
  stopSpeaking();
});

// === Oral mode mic ===
const oralMicBtn = document.getElementById('oral-mic-btn');

oralMicBtn.addEventListener('mousedown', () => { oralMicBtn.classList.add('listening'); setWaveState('listening'); startListening(); });
oralMicBtn.addEventListener('touchstart', (e) => { e.preventDefault(); oralMicBtn.classList.add('listening'); setWaveState('listening'); startListening(); }, { passive: false });
oralMicBtn.addEventListener('mouseup', () => { oralMicBtn.classList.remove('listening'); stopListening(); });
oralMicBtn.addEventListener('touchend', () => { oralMicBtn.classList.remove('listening'); stopListening(); });

// === Mode toggle ===
const textModeEl = document.getElementById('text-mode');
const oralModeEl = document.getElementById('oral-mode');
const modeToggleBtn = document.getElementById('mode-toggle');
const oralStateLbl = document.getElementById('oral-state-label');
const waveEl = document.getElementById('wave-animation');
const correctionsBtn = document.getElementById('corrections-btn');
const correctionsCount = document.getElementById('corrections-count');
const correctionsPanel = document.getElementById('corrections-panel');

setWaveState = function(state) {
  waveEl.className = state === 'idle' ? '' : state;
  const labels = { idle: 'Listo para escuchar', listening: 'Escuchando...', speaking: 'Hablando...' };
  oralStateLbl.textContent = labels[state] ?? '';
};

function updateCorrectionsCount() {
  const n = pendingCorrections.length;
  correctionsCount.textContent = n;
  correctionsBtn.hidden = n === 0;
}

function renderOralCorrectionsPanel() {
  if (!pendingCorrections.length) {
    correctionsPanel.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No hay correcciones por ahora.</p>';
    return;
  }
  correctionsPanel.innerHTML = pendingCorrections.map(c => `
    <div class="correction-item" style="margin-bottom:10px">
      <span class="correction-original">${escapeHtml(c.original)}</span>
      <span class="correction-arrow">→</span>
      <span class="correction-corrected">${escapeHtml(c.corrected)}</span>
      <div class="correction-explanation">${escapeHtml(c.explanation)}</div>
    </div>
  `).join('');
}

modeToggleBtn.addEventListener('click', () => {
  isOralMode = !isOralMode;
  textModeEl.hidden = isOralMode;
  oralModeEl.hidden = !isOralMode;
  oralModeEl.classList.toggle('active', isOralMode);
  modeToggleBtn.textContent = isOralMode ? 'Mode Texte' : 'Mode Oral';
  stopSpeaking();
  if (isOralMode) setWaveState('idle');
});

correctionsBtn.addEventListener('click', () => {
  const isHidden = correctionsPanel.hidden;
  correctionsPanel.hidden = !isHidden;
  if (!isHidden) return;
  renderOralCorrectionsPanel();
});

// === Init ===
async function init() {
  const online = await updateStatus();
  if (online) {
    const thinkingEl = appendThinkingIndicator();
    try {
      const { reply } = await sendToOllama('Saluda al usuario y pregúntale de qué quiere hablar hoy. Sé breve y amigable.');
      thinkingEl.remove();
      appendAiMessage(reply);
      speak(reply);
      history = [];
    } catch {
      thinkingEl.remove();
      appendAiMessage('¡Hola! ¿De qué quieres hablar hoy?');
      speak('¡Hola! ¿De qué quieres hablar hoy?');
    }
  } else {
    appendAiMessage('⚠️ Ollama no está en línea. Ejecuta lancer.bat para iniciarlo.');
  }
}

init();
