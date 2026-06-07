// Vercel serverless — nolicae-tts (consolidated multi-language TTS)
const TTS_BASE_URL = 'https://nolicae-tts.hf.space';
const DEFAULT_VOICE = 'es-ES-ElviraNeural';

async function espagnolTTS(text, voice = DEFAULT_VOICE) {
  const response = await fetch(`${TTS_BASE_URL}/v1/text:synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { name: voice },
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
  const { text, voice = DEFAULT_VOICE } = req.query;
  if (!text) return res.status(400).end('missing text');

  try {
    const audio = await espagnolTTS(text, voice);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(audio);
  } catch (e) {
    console.error('TTS error:', e.message);
    res.status(500).end('TTS error');
  }
};
