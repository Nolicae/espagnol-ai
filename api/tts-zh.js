// Vercel serverless function — nolicae-tts consolidated space (Chinese/Mandarin voices)
const TTS_BASE_URL = 'https://nolicae-nolicae-tts.hf.space';
const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural';
const RETRY_DELAYS = [2000, 4000, 6000]; // retry up to 3x if space is waking

async function chineseTTS(text, voice = DEFAULT_VOICE) {
  const body = JSON.stringify({
    input: { text },
    voice: { name: voice },
    audioConfig: { audioEncoding: 'MP3' }
  });

  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
    }
    try {
      const response = await fetch(`${TTS_BASE_URL}/v1/text:synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!response.ok) {
        lastErr = new Error(`chinese-tts ${response.status}`);
        continue;
      }
      const data = await response.json();
      const audio = Buffer.from(data.audioContent, 'base64');
      if (audio.length < 100) {
        lastErr = new Error('audio too short, retrying');
        continue;
      }
      return audio;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

module.exports = async function handler(req, res) {
  const { text, voice = DEFAULT_VOICE } = req.query;
  if (!text) return res.status(400).end('missing text');
  try {
    const audio = await chineseTTS(text, voice);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(audio);
  } catch (e) {
    console.error('TTS-ZH error:', e.message);
    res.status(500).end('TTS error');
  }
};
