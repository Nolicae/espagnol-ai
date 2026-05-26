// Vercel serverless — Edge TTS neural (es-ES-AlvaroNeural), fallback Google TTS
const WebSocket = require('ws');

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function escapeXml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function edgeTTS(text, voice) {
  const connId = uuid().replace(/-/g, '');
  const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/realtimefor/edge/v1` +
    `?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${connId}`;
  const ts = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      }
    });
    const chunks = [];
    let resolved = false;
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('timeout')); }, 9000);

    ws.on('open', () => {
      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({ context: { synthesis: { audio: {
          metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
          outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
        }}}})
      );
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='es-ES'>` +
        `<voice name='${voice}'>${escapeXml(text)}</voice></speak>`;
      ws.send(
        `X-RequestId:${connId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts}\r\nPath:ssml\r\n\r\n${ssml}`
      );
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const headerLen = buf.readUInt16BE(0);
        const header = buf.slice(2, 2 + headerLen).toString();
        if (header.includes('Path:audio')) {
          const audio = buf.slice(2 + headerLen);
          if (audio.length > 0) chunks.push(audio);
        }
      } else {
        const msg = typeof data === 'string' ? data : data.toString();
        if (msg.includes('Path:turn.end') && !resolved) {
          resolved = true;
          clearTimeout(timer);
          ws.close();
          resolve(Buffer.concat(chunks));
        }
      }
    });

    ws.on('error', e => { clearTimeout(timer); reject(e); });
    ws.on('close', () => {
      clearTimeout(timer);
      if (!resolved && chunks.length > 0) { resolved = true; resolve(Buffer.concat(chunks)); }
      else if (!resolved) reject(new Error('closed without audio'));
    });
  });
}

async function googleTTS(text) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=es&client=tw-ob`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });
  if (!r.ok) throw new Error(`google-tts ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

module.exports = async function handler(req, res) {
  const { text, voice = 'es-ES-AlvaroNeural' } = req.query;
  if (!text) return res.status(400).end('missing text');

  let audio;
  try {
    audio = await edgeTTS(text, voice);
    console.log('edge-tts ok');
  } catch (e) {
    console.warn('edge-tts failed:', e.message, '— fallback google');
    try { audio = await googleTTS(text); }
    catch (e2) { return res.status(500).end('TTS error'); }
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  res.end(audio);
};
