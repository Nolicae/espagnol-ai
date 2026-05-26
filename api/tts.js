// Vercel serverless function — Edge TTS (Microsoft Edge neural voices, no API key)
const WebSocket = require('ws');

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function edgeTTS(text, voice) {
  const connId = uuid().replace(/-/g, '');
  const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/realtimefor/edge/v1` +
    `?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${connId}`;
  const ts = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const chunks = [];
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('edge-tts timeout')); }, 10000);

    ws.on('open', () => {
      // 1. Config audio
      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({ context: { synthesis: { audio: {
          metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
          outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
        }}}})
      );
      // 2. SSML
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='es-ES'>` +
        `<voice name='${voice}'>${escapeXml(text)}</voice></speak>`;
      ws.send(
        `X-RequestId:${connId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts}\r\nPath:ssml\r\n\r\n${ssml}`
      );
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        // Binary frame: [2-byte header length][header][audio]
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const headerLen = buf.readUInt16BE(0);
        const header = buf.slice(2, 2 + headerLen).toString();
        if (header.includes('Path:audio')) {
          const audio = buf.slice(2 + headerLen);
          if (audio.length > 0) chunks.push(audio);
        }
      } else {
        const msg = typeof data === 'string' ? data : data.toString();
        if (msg.includes('Path:turn.end')) {
          clearTimeout(timer);
          ws.close();
          resolve(Buffer.concat(chunks));
        }
      }
    });

    ws.on('error', e => { clearTimeout(timer); reject(e); });
  });
}

module.exports = async function handler(req, res) {
  const { text, voice = 'es-ES-AlvaroNeural' } = req.query;
  if (!text) return res.status(400).end('missing text');

  try {
    const audio = await edgeTTS(text, voice);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(audio);
  } catch (e) {
    console.error('edge-tts error:', e.message);
    res.status(500).end('TTS error');
  }
};
