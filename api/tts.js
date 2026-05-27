// Vercel serverless — espagnol-tts (local Google TTS-compatible API)
const TTS_BASE_URL = 'https://nolicae-espagnol-tts.hf.space';
const DEFAULT_VOICE = 'es-ES-ElviraNeural'; // will add voice selection UI later

async function espagnolTTS(text) {
  const response = await fetch(`${TTS_BASE_URL}/v1/text:synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { name: DEFAULT_VOICE },
      audioConfig: { audioEncoding: 'MP3' }
    })
  });

  if (!response.ok) {
    throw new Error(`espagnol-tts ${response.status}`);
  }

  const data = await response.json();
  return Buffer.from(data.audioContent, 'base64');
}

module.exports = async function handler(req, res) {
  const { text } = req.query;
  if (!text) return res.status(400).end('missing text');

  try {
    const audio = await espagnolTTS(text);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(audio);
  } catch (e) {
    console.error('TTS error:', e.message);
    res.status(500).end('TTS error');
  }
};
