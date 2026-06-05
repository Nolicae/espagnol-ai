// Vercel serverless function — russkij-tts space (Russian voices)
const TTS_BASE_URL = 'https://nolicae-russkij-tts.hf.space';
const DEFAULT_VOICE = 'ru-RU-SvetlanaNeural';

async function russkijTTS(text, voice = DEFAULT_VOICE) {
  const response = await fetch(`${TTS_BASE_URL}/v1/text:synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { name: voice },
      audioConfig: { audioEncoding: 'MP3' }
    })
  });
  if (!response.ok) throw new Error(`russkij-tts ${response.status}`);
  const data = await response.json();
  return Buffer.from(data.audioContent, 'base64');
}

module.exports = async function handler(req, res) {
  const { text, voice = DEFAULT_VOICE } = req.query;
  if (!text) return res.status(400).end('missing text');
  try {
    const audio = await russkijTTS(text, voice);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(audio);
  } catch (e) {
    console.error('TTS-RU error:', e.message);
    res.status(500).end('TTS error');
  }
};
