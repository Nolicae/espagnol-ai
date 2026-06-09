# Lun.ai Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distribute the espagnol-ai PWA as "Lun.ai" across a landing page, Google Play Store (Android TWA), and Apple App Store (iOS Capacitor).

**Architecture:** The existing `index.html` stays the single source of truth. The Android TWA wrapper loads it via URL (Chrome engine, Web Speech API works natively). The iOS Capacitor wrapper loads it locally and a 3-branch speech detection shim routes to the native `@capacitor-community/speech-recognition` plugin instead of the unavailable WKWebView Web Speech API.

**Tech Stack:** Vercel (hosting), PWABuilder (TWA generation), Capacitor 6 + `@capacitor-community/speech-recognition` (iOS wrapper), Codemagic (cloud iOS CI/CD), sharp (icon generation, already in devDependencies).

---

> ⚠️ **Components A and B are sequential prerequisites. Components C and D can run in parallel after Task 2.**

---

## File Map

```
espagnol-ai/                          ← existing repo
├── manifest.json                     MODIFY — name, description, icons
├── index.html                        MODIFY — title, meta, speech bridge (Task 7)
├── icons/
│   ├── icon.svg                      existing source
│   ├── icon-180.png                  existing
│   ├── icon-192.png                  CREATE (Task 2)
│   ├── icon-512.png                  CREATE (Task 2)
│   └── icon-maskable.png             CREATE (Task 2)
├── .well-known/
│   └── assetlinks.json               CREATE (Task 4) — Android TWA domain proof
└── scripts/
    └── gen-icons.js                  CREATE (Task 2)

lun-ai-landing/                       ← NEW repo (Task 3)
└── index.html

lun-ai-ios/                           ← NEW repo (Tasks 6–8)
├── package.json
├── capacitor.config.json
├── codemagic.yaml
└── src/
    └── index.html                    ← copy of espagnol-ai/index.html at build time
```

---

## Task 1: Branding — manifest.json + index.html head

**Files:**
- Modify: `C:\Users\0deco\Downloads\espagnol-ai\manifest.json`
- Modify: `C:\Users\0deco\Downloads\espagnol-ai\index.html` (lines 6, 9)

- [ ] **Step 1: Update manifest.json**

Replace the entire file with:

```json
{
  "name": "Lun.ai",
  "short_name": "Lun.ai",
  "description": "AI language coach — speak, listen, learn in 8 languages",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#0d0f1a",
  "theme_color": "#181b2d",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    }
  ]
}
```

- [ ] **Step 2: Update index.html head (lines 6 and 9)**

Change line 6 from:
```html
  <title>Espagnolai — Ondas</title>
```
to:
```html
  <title>Lun.ai</title>
```

Change line 9 from:
```html
  <meta name="apple-mobile-web-app-title" content="Espagnolai">
```
to:
```html
  <meta name="apple-mobile-web-app-title" content="Lun.ai">
```

Add OG meta tags after line 9 (after the apple-mobile-web-app-title line):
```html
  <meta name="description" content="AI language coach — speak, listen, learn in 8 languages">
  <meta property="og:title" content="Lun.ai">
  <meta property="og:description" content="AI language coach — speak, listen, learn in 8 languages">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://lun-ai.vercel.app/icons/icon-512.png">
```

- [ ] **Step 3: Verify**

Open `index.html` in browser. Check browser tab shows "Lun.ai". On mobile Chrome, trigger "Add to Home Screen" — the prompt should show "Lun.ai".

- [ ] **Step 4: Commit**

```bash
git add manifest.json index.html
git commit -m "feat: rebrand to Lun.ai (manifest + meta tags)"
```

---

## Task 2: Icons — generate PNG variants

**Files:**
- Create: `C:\Users\0deco\Downloads\espagnol-ai\scripts\gen-icons.js`
- Creates: `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable.png`

- [ ] **Step 1: Install sharp if not already installed**

```bash
cd C:\Users\0deco\Downloads\espagnol-ai
npm install
```

Expected: `node_modules/sharp` present.

- [ ] **Step 2: Create the icon generation script**

Create `scripts/gen-icons.js`:

```javascript
const sharp = require('sharp');
const path  = require('path');

const src  = path.join(__dirname, '../icons/icon.svg');
const dest = path.join(__dirname, '../icons');

async function run() {
  // Standard icons
  await sharp(src).resize(192, 192).png().toFile(path.join(dest, 'icon-192.png'));
  console.log('✓ icon-192.png');

  await sharp(src).resize(512, 512).png().toFile(path.join(dest, 'icon-512.png'));
  console.log('✓ icon-512.png');

  // Maskable: add 20% safe-zone padding (icon fills 80% of canvas on a colored bg)
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 13, g: 15, b: 26, alpha: 1 } }
  })
  .composite([{ input: await sharp(src).resize(410, 410).png().toBuffer(), gravity: 'centre' }])
  .png()
  .toFile(path.join(dest, 'icon-maskable.png'));
  console.log('✓ icon-maskable.png');
}

run().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Run the script**

```bash
node scripts/gen-icons.js
```

Expected output:
```
✓ icon-192.png
✓ icon-512.png
✓ icon-maskable.png
```

- [ ] **Step 4: Verify icons**

Open `icons/icon-512.png` in an image viewer. Should show the orb on a dark background, 512×512px.
Open `icons/icon-maskable.png` — orb should be centered with dark padding around it (safe zone for Android adaptive icons).

- [ ] **Step 5: Commit**

```bash
git add icons/icon-192.png icons/icon-512.png icons/icon-maskable.png scripts/gen-icons.js
git commit -m "feat: generate Lun.ai PNG icons (192, 512, maskable)"
git push origin main
```

---

## Task 3: Landing Page

**Files:**
- Create: new GitHub repo `lun-ai-landing`
- Create: `index.html` in that repo

- [ ] **Step 1: Create new GitHub repo**

Go to https://github.com/new — name: `lun-ai-landing`, public, no README. Then clone locally:

```bash
git clone https://github.com/Nolicae/lun-ai-landing.git
cd lun-ai-landing
```

- [ ] **Step 2: Create index.html**

Create `index.html` with the full landing page content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lun.ai — AI Language Coach</title>
<meta name="description" content="Speak. Listen. Learn. AI-powered voice conversations in 8 languages.">
<style>
:root {
  --ink:  #f0ece0;
  --soft: rgba(240,236,224,0.55);
  --dim:  rgba(240,236,224,0.28);
  --serif: Georgia,'Times New Roman',serif;
  --mono: 'Courier New',Courier,monospace;
  --sans: system-ui,-apple-system,sans-serif;
  --bg1: #2a2e48; --bg2: #181b2d; --bg3: #0d0f1a;
}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{min-height:100%;background:var(--bg3);color:var(--ink);font-family:var(--sans);}
body{
  background:
    radial-gradient(140% 100% at 50% 0%, hsla(220,65%,62%,0.10) 0%, hsla(220,60%,50%,0.05) 45%, var(--bg3) 100%),
    radial-gradient(140% 100% at 50% 0%, var(--bg1) 0%, var(--bg2) 45%, var(--bg3) 100%);
}

/* ── Hero ── */
.hero{
  min-height: 100svh;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:32px;padding:48px 24px;text-align:center;
}
.orb-wrap{
  width:120px;height:120px;border-radius:50%;position:relative;
  background: radial-gradient(circle at 38% 36%,
    rgba(230,240,255,0.92) 0%, rgba(150,190,255,0.45) 55%, rgba(80,130,230,0.12) 100%);
  box-shadow:
    0 0 40px rgba(150,195,255,0.50),
    0 0 90px rgba(100,155,255,0.20),
    inset 0 2px 4px rgba(255,255,255,0.70);
  animation: pulse 3s ease-in-out infinite;
}
.orb-wrap::after{
  content:'';position:absolute;inset:-16px;border-radius:50%;
  border:1px solid rgba(180,210,255,0.22);
  animation: ring 3s ease-in-out infinite;
}
@keyframes pulse{
  0%,100%{box-shadow:0 0 40px rgba(150,195,255,0.50),0 0 90px rgba(100,155,255,0.20),inset 0 2px 4px rgba(255,255,255,0.70);}
  50%{box-shadow:0 0 60px rgba(150,195,255,0.70),0 0 130px rgba(100,155,255,0.35),inset 0 2px 4px rgba(255,255,255,0.70);}
}
@keyframes ring{
  0%,100%{opacity:0.22;transform:scale(1);}
  50%{opacity:0.06;transform:scale(1.12);}
}
.hero-title{font-family:var(--serif);font-size:clamp(2.8rem,8vw,4.5rem);letter-spacing:-0.01em;}
.hero-sub{font-family:var(--mono);font-size:0.75rem;letter-spacing:3px;text-transform:uppercase;color:var(--soft);}
.cta-group{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:8px;}
.cta-btn{
  display:inline-flex;align-items:center;gap:8px;
  padding:14px 24px;border-radius:999px;font-size:0.88rem;font-weight:500;
  text-decoration:none;transition:opacity .15s;
}
.cta-btn:hover{opacity:0.82;}
.cta-primary{background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.22);color:var(--ink);}
.cta-secondary{background:transparent;border:1px solid rgba(255,255,255,0.14);color:var(--soft);}

/* ── Languages ── */
.section{padding:80px 24px;max-width:600px;margin:0 auto;text-align:center;}
.section-label{font-family:var(--mono);font-size:0.68rem;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:40px;}
.langs{display:flex;flex-wrap:wrap;gap:20px;justify-content:center;}
.lang-item{display:flex;flex-direction:column;align-items:center;gap:10px;}
.lang-orb{
  width:54px;height:54px;border-radius:50%;
  background: radial-gradient(circle at 38% 36%,
    rgba(230,240,255,0.88) 0%, rgba(150,190,255,0.40) 55%, rgba(80,130,230,0.10) 100%);
  box-shadow:0 0 16px rgba(150,195,255,0.30),inset 0 1px 2px rgba(255,255,255,0.60);
  border:1px solid rgba(255,255,255,0.30);
}
.lang-name{font-family:var(--serif);font-size:0.85rem;color:var(--soft);}

/* ── How it works ── */
.steps{display:flex;flex-direction:column;gap:28px;margin-top:40px;text-align:left;}
.step{display:flex;gap:20px;align-items:flex-start;}
.step-num{
  width:32px;height:32px;border-radius:50%;flex-shrink:0;
  background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);
  font-family:var(--mono);font-size:0.72rem;color:var(--dim);
  display:flex;align-items:center;justify-content:center;
}
.step-text{padding-top:6px;}
.step-text strong{display:block;margin-bottom:4px;color:var(--ink);}
.step-text span{font-size:0.875rem;color:var(--soft);}

/* ── Footer ── */
footer{padding:48px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);}
footer a{color:var(--dim);font-family:var(--mono);font-size:0.68rem;letter-spacing:2px;text-decoration:none;}
footer a:hover{color:var(--soft);}
</style>
</head>
<body>

<section class="hero">
  <div class="orb-wrap"></div>
  <div>
    <h1 class="hero-title">Lun.ai</h1>
    <p class="hero-sub">AI Language Coach</p>
  </div>
  <div class="cta-group">
    <a href="https://play.google.com/store/apps/details?id=ai.lun.app" class="cta-btn cta-primary">
      ▶ Google Play
    </a>
    <a href="https://apps.apple.com/app/lun-ai/id000000000" class="cta-btn cta-primary">
      ⬇ App Store
    </a>
    <a href="https://lun-ai.vercel.app" class="cta-btn cta-secondary">
      Open in browser →
    </a>
  </div>
</section>

<section class="section">
  <p class="section-label">8 languages</p>
  <div class="langs">
    <div class="lang-item"><div class="lang-orb"></div><span class="lang-name">Español</span></div>
    <div class="lang-item"><div class="lang-orb"></div><span class="lang-name">English</span></div>
    <div class="lang-item"><div class="lang-orb"></div><span class="lang-name">Português</span></div>
    <div class="lang-item"><div class="lang-orb"></div><span class="lang-name">Français</span></div>
    <div class="lang-item"><div class="lang-orb"></div><span class="lang-name">العربية</span></div>
    <div class="lang-item"><div class="lang-orb"></div><span class="lang-name">中文</span></div>
    <div class="lang-item"><div class="lang-orb"></div><span class="lang-name">Русский</span></div>
    <div class="lang-item"><div class="lang-orb"></div><span class="lang-name">日本語</span></div>
  </div>
</section>

<section class="section">
  <p class="section-label">How it works</p>
  <div class="steps">
    <div class="step">
      <div class="step-num">01</div>
      <div class="step-text">
        <strong>Choose a language</strong>
        <span>Pick from 8 languages. Each has dozens of regional voices to explore.</span>
      </div>
    </div>
    <div class="step">
      <div class="step-num">02</div>
      <div class="step-text">
        <strong>Press the orb</strong>
        <span>One tap starts a live conversation with an AI tutor in your chosen language.</span>
      </div>
    </div>
    <div class="step">
      <div class="step-num">03</div>
      <div class="step-text">
        <strong>Speak naturally</strong>
        <span>The AI listens, responds in real time, and adapts to your level.</span>
      </div>
    </div>
  </div>
</section>

<footer>
  <a href="https://lun-ai.vercel.app/privacy">Privacy</a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://lun-ai.vercel.app">Open app</a>
</footer>

</body>
</html>
```

> **Note:** Update the Play Store and App Store URLs in the CTA buttons once the apps are published (Task 5 and Task 9).

- [ ] **Step 3: Commit and push**

```bash
git add index.html
git commit -m "feat: Lun.ai landing page"
git push origin main
```

- [ ] **Step 4: Deploy to Vercel**

Go to https://vercel.com/new → Import `lun-ai-landing` repo → Deploy.
No build step needed (static HTML). Set custom domain if `lun.ai` is purchased.

- [ ] **Step 5: Verify**

Open the deployed URL. Check that:
- Orb pulses
- 8 language items visible
- 3 CTA buttons visible
- Page is readable on mobile

---

## Task 4: Android — assetlinks.json (TWA domain proof)

**Files:**
- Create: `C:\Users\0deco\Downloads\espagnol-ai\.well-known\assetlinks.json`

> ⚠️ The SHA-256 fingerprint is generated by PWABuilder in Task 5. Run Task 5 first to get it, then fill it in here.

- [ ] **Step 1: Create the directory and file**

Create `.well-known/assetlinks.json` in the `espagnol-ai` repo root:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "ai.lun.app",
    "sha256_cert_fingerprints": ["REPLACE_WITH_FINGERPRINT_FROM_PWBUILDER"]
  }
}]
```

- [ ] **Step 2: Fill in the fingerprint**

After running PWABuilder (Task 5), copy the SHA-256 fingerprint it provides and replace `REPLACE_WITH_FINGERPRINT_FROM_PWBUILDER` in the file.

Format: `"AB:CD:EF:01:23:..."` (colon-separated hex pairs, all caps).

- [ ] **Step 3: Verify the file is publicly accessible**

After deploying, open in browser:
```
https://espagnol-ai-repo.vercel.app/.well-known/assetlinks.json
```
Expected: the JSON is returned (not a 404).

> If Vercel returns 404, add a `vercel.json` at the repo root:
> ```json
> { "headers": [{ "source": "/.well-known/(.*)", "headers": [{ "key": "Content-Type", "value": "application/json" }] }] }
> ```

- [ ] **Step 4: Commit and push**

```bash
git add .well-known/assetlinks.json
git commit -m "feat: Android TWA assetlinks.json"
git push origin main
```

---

## Task 5: Android — PWABuilder + Play Store submission

> This task is mostly manual steps. No code is written.

**Prerequisites:** Google Play developer account ($25 one-time at https://play.google.com/console/signup), Task 4 complete with fingerprint filled in.

- [ ] **Step 1: Open PWABuilder**

Go to https://www.pwabuilder.com

Enter URL: `https://espagnol-ai-repo.vercel.app`

Click "Start". PWABuilder will scan the PWA manifest and service worker.

- [ ] **Step 2: Package for Android**

Click "Package for stores" → "Android" → "Generate package".

Settings to confirm:
- Package ID: `ai.lun.app`
- App name: `Lun.ai`
- Version: `1`
- Version name: `1.0`
- Signing: choose "New" to let PWABuilder generate a key

Download the ZIP. Inside you'll find:
- `lun-ai.apk` (test build)
- `lun-ai.aab` (Play Store release)
- `signing-key-info.txt` — **copy the SHA-256 fingerprint from this file into `.well-known/assetlinks.json` (Task 4)**

- [ ] **Step 3: Test the APK on Android**

Transfer `lun-ai.apk` to an Android phone (or use an emulator):
- Enable "Install unknown apps" in Android settings
- Install the APK
- Open the app — it should launch with no browser chrome (no address bar), behaving like a native app
- Test voice input — should work (TWA uses Chrome, Web Speech API available)

- [ ] **Step 4: Submit to Play Store**

Go to https://play.google.com/console

- Create new app → "Lun.ai" → App / Free / Not primarily for children
- Upload `lun-ai.aab` in "Production" → "Releases"
- Fill in store listing:
  - Short description: `AI voice conversations in 8 languages`
  - Full description: `Lun.ai is an AI language coach that teaches through real conversation. Choose Spanish, English, French, Portuguese, Arabic, Russian, Chinese or Japanese — then simply speak. The AI listens, responds naturally, and adapts to your level. No lessons. No exercises. Just conversation.`
  - Category: Education
  - Screenshots: take 2–8 screenshots from the APK test
  - Feature graphic: export `icons/icon.svg` at 1024×500 with the app name overlaid
- Complete content rating questionnaire
- Submit for review

Expected: reviewed in ~3 business days.

---

## Task 6: iOS — Capacitor project setup

**Files:**
- Create: new GitHub repo `lun-ai-ios`
- Create: `lun-ai-ios/package.json`
- Create: `lun-ai-ios/capacitor.config.json`

- [ ] **Step 1: Create GitHub repo and clone**

Go to https://github.com/new → name: `lun-ai-ios`, private. Clone locally:

```bash
git clone https://github.com/Nolicae/lun-ai-ios.git
cd lun-ai-ios
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "lun-ai-ios",
  "version": "1.0.0",
  "description": "Lun.ai iOS App Store wrapper",
  "scripts": {
    "sync": "cap sync ios"
  },
  "dependencies": {
    "@capacitor/cli": "^6.0.0",
    "@capacitor/core": "^6.0.0",
    "@capacitor/ios": "^6.0.0",
    "@capacitor-community/speech-recognition": "^5.0.0"
  }
}
```

- [ ] **Step 3: Create capacitor.config.json**

```json
{
  "appId": "ai.lun.app",
  "appName": "Lun.ai",
  "webDir": "src",
  "plugins": {
    "SpeechRecognition": {
      "language": "es-ES"
    }
  }
}
```

- [ ] **Step 4: Create src/ and copy index.html**

```bash
mkdir src
cp path/to/espagnol-ai/index.html src/index.html
```

> At each release, re-copy `index.html` from the espagnol-ai repo (after Task 7's speech bridge is in place).

- [ ] **Step 5: Install dependencies and init Capacitor**

```bash
npm install
npx cap init "Lun.ai" "ai.lun.app" --web-dir src
npx cap add ios
```

Expected: `ios/` directory created with Xcode project.

- [ ] **Step 6: Commit**

```bash
git add package.json capacitor.config.json src/index.html
git commit -m "feat: Capacitor iOS project scaffold"
git push origin main
```

---

## Task 7: iOS — Speech bridge in index.html

**Files:**
- Modify: `C:\Users\0deco\Downloads\espagnol-ai\index.html`
  - `startRecognition()` at line ~3487
  - `stopRecognition()` at line ~3509

- [ ] **Step 1: Replace startRecognition()**

Find the current `startRecognition()` function (starts at line ~3487):

```javascript
function startRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  recognition = new SR();
  ...
```

Replace the entire function with:

```javascript
function startRecognition() {
  // Branch 1: Capacitor native runtime (iOS App Store build)
  if (window.Capacitor?.isNativePlatform()) {
    startCapacitorRecognition();
    return;
  }
  // Branch 2: Web Speech API (Chrome, Edge, Safari PWA) — existing code unchanged
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return; // Branch 3: no SR → Groq Whisper fallback via triggerProcessing()
  recognition = new SR();
  recognition.continuous     = true;
  recognition.interimResults = true;
  recognition.lang           = LANGUAGES[currentLang]?.srLang || 'es-ES';
  recognition.onresult    = handleSpeechResult;
  recognition.onspeechend = () => setTimeout(triggerProcessing, 50);
  recognition.onerror = e => { if (e.error !== 'no-speech') console.warn('[SR]', e.error); };
  recognition.onend = () => {
    if (!sessionActive) return;
    setTimeout(() => {
      if (!sessionActive) return;
      stopRecognition();
      startRecognition();
    }, 150);
  };
  recognition.start();
}

function startCapacitorRecognition() {
  const { SpeechRecognition } = window.Capacitor.Plugins;
  let lastPartial = '';

  SpeechRecognition.requestPermissions().then(() => {
    SpeechRecognition.start({
      language: LANGUAGES[currentLang]?.srLang || 'es-ES',
      partialResults: true,
      maxResults: 1,
      popup: false,
    });
  });

  SpeechRecognition.addListener('partialResults', (data) => {
    if (!sessionActive) return;
    lastPartial = (data.matches?.[0] || '').trim();
    if (lastPartial) {
      clearSilenceTimer();
      userSpokeRecently = true;
      if (aiSpeaking) interruptTTS();
    }
  });

  SpeechRecognition.addListener('listeningState', (data) => {
    if (data.status === 'stopped' && lastPartial) {
      pendingWSTranscript = (pendingWSTranscript + ' ' + lastPartial).trim();
      lastPartial = '';
      triggerProcessing();
    }
    if (sessionActive && data.status === 'stopped') {
      setTimeout(() => { if (sessionActive) startCapacitorRecognition(); }, 150);
    }
  });
}
```

- [ ] **Step 2: Replace stopRecognition()**

Find `stopRecognition()` (line ~3509):

```javascript
function stopRecognition() {
  if (!recognition) return;
  recognition.onend = null;
  try { recognition.stop(); } catch (_) {}
  recognition = null;
}
```

Replace with:

```javascript
function stopRecognition() {
  if (window.Capacitor?.isNativePlatform()) {
    const { SpeechRecognition } = window.Capacitor.Plugins;
    SpeechRecognition.stop().catch(() => {});
    SpeechRecognition.removeAllListeners();
    return;
  }
  if (!recognition) return;
  recognition.onend = null;
  try { recognition.stop(); } catch (_) {}
  recognition = null;
}
```

- [ ] **Step 3: Verify nothing broke on web**

Open `index.html` on Chrome desktop. Start a Spanish session. Speech should work exactly as before (Capacitor branch is never taken in a browser).

- [ ] **Step 4: Update lun-ai-ios/src/index.html**

Copy the modified `index.html` to the iOS repo:

```bash
cp C:/Users/0deco/Downloads/espagnol-ai/index.html path/to/lun-ai-ios/src/index.html
```

- [ ] **Step 5: Commit both repos**

In `espagnol-ai`:
```bash
git add index.html
git commit -m "feat: Capacitor speech bridge for iOS App Store"
git push origin main
```

In `lun-ai-ios`:
```bash
git add src/index.html
git commit -m "feat: update index.html with speech bridge"
git push origin main
```

---

## Task 8: iOS — Codemagic CI/CD setup

**Files:**
- Create: `lun-ai-ios/codemagic.yaml`

- [ ] **Step 1: Create Apple Developer account**

Go to https://developer.apple.com/account → enroll in Apple Developer Program ($99/year).
Complete identity verification (can take 1–2 business days).

- [ ] **Step 2: Create App ID and App Store Connect entry**

In App Store Connect (https://appstoreconnect.apple.com):
- Go to "My Apps" → "+" → New App
- Platform: iOS
- Name: `Lun.ai`
- Bundle ID: `ai.lun.app` (create it first in developer.apple.com → Certificates, IDs & Profiles → Identifiers)
- SKU: `lunai-ios-001`

- [ ] **Step 3: Connect Codemagic to the repo**

Go to https://codemagic.io → Sign in with GitHub → Add `lun-ai-ios` repo.

- [ ] **Step 4: Create codemagic.yaml**

Create `lun-ai-ios/codemagic.yaml`:

```yaml
workflows:
  ios-distribution:
    name: Lun.ai iOS Distribution
    max_build_duration: 60
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_identifier: ai.lun.app
      vars:
        APP_STORE_CONNECT_ISSUER_ID: $APP_STORE_CONNECT_ISSUER_ID
        APP_STORE_CONNECT_KEY_IDENTIFIER: $APP_STORE_CONNECT_KEY_IDENTIFIER
        APP_STORE_CONNECT_PRIVATE_KEY: $APP_STORE_CONNECT_PRIVATE_KEY
        CERTIFICATE_PRIVATE_KEY: $CERTIFICATE_PRIVATE_KEY
    scripts:
      - name: Install dependencies
        script: npm install
      - name: Capacitor sync
        script: npx cap sync ios
      - name: Set bundle version
        script: |
          LATEST_BUILD_NUMBER=$(app-store-connect get-latest-build-number "ai.lun.app")
          agvtool new-version -all $(($LATEST_BUILD_NUMBER + 1))
      - name: Build iOS
        script: |
          xcode-project build-ipa \
            --workspace ios/App/App.xcworkspace \
            --scheme App \
            --archive-path build/App.xcarchive
    artifacts:
      - build/ios/ipa/*.ipa
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
        submit_to_app_store: false
```

- [ ] **Step 5: Add secrets to Codemagic**

In Codemagic → `lun-ai-ios` → Environment variables, add:
- `APP_STORE_CONNECT_ISSUER_ID` — from App Store Connect → Users → Keys
- `APP_STORE_CONNECT_KEY_IDENTIFIER` — same page
- `APP_STORE_CONNECT_PRIVATE_KEY` — download the `.p8` key file, paste its contents
- `CERTIFICATE_PRIVATE_KEY` — generate via: `ssh-keygen -t rsa -b 2048 -m PEM -f codemagic_key -N ""`, paste `codemagic_key` contents

- [ ] **Step 6: Commit and trigger first build**

```bash
git add codemagic.yaml
git commit -m "feat: Codemagic CI for App Store distribution"
git push origin main
```

Go to Codemagic → `lun-ai-ios` → Start build → `ios-distribution`.
Expected: build completes in ~15–20 minutes, IPA uploaded to TestFlight.

- [ ] **Step 7: Test on a real iPhone via TestFlight**

In App Store Connect → TestFlight → add your Apple ID as internal tester.
Install the app on iPhone. Test: choose a language, press the orb, speak — AI should respond.

---

## Task 9: iOS — App Store submission

> This task is manual. Do it after TestFlight testing passes (Task 8, Step 7).

- [ ] **Step 1: Prepare screenshots**

Using your iPhone (or iOS Simulator in Xcode if available via Codemagic remote Mac), take screenshots at:
- iPhone 6.7" (1290×2796): required
- iPhone 6.1" (1179×2556): required

Minimum 3 screenshots per size. Suggested screens to capture:
1. Onboarding language selector (orb carousel)
2. Conversation screen (orb pulsing)
3. Settings / voice selector (constellation map)

- [ ] **Step 2: Create privacy policy page**

Add `/privacy` route to the `espagnol-ai` Vercel project. Create `privacy.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Lun.ai — Privacy Policy</title></head>
<body style="font-family:sans-serif;max-width:640px;margin:48px auto;padding:0 24px;color:#222;line-height:1.6">
<h1>Privacy Policy</h1>
<p>Last updated: 2026-06-09</p>
<h2>Data we collect</h2>
<p>Lun.ai processes your voice input to power AI conversations. Audio is sent to our servers for processing and is not stored after the session ends.</p>
<h2>Microphone</h2>
<p>The app requires microphone access to listen to your speech. This data is used solely for real-time conversation and is not retained.</p>
<h2>No account required</h2>
<p>Lun.ai does not require you to create an account. No personal information is collected or stored.</p>
<h2>Contact</h2>
<p>Questions: contact via GitHub at github.com/Nolicae/espagnol-ai</p>
</body>
</html>
```

Add a Vercel route in `vercel.json` (create if it doesn't exist):
```json
{
  "rewrites": [{ "source": "/privacy", "destination": "/privacy.html" }]
}
```

- [ ] **Step 3: Submit in App Store Connect**

In App Store Connect → My Apps → Lun.ai → + Version → 1.0:
- Upload screenshots
- Description: `Lun.ai is an AI language coach that teaches through real conversation. Choose from 8 languages — Spanish, English, French, Portuguese, Arabic, Russian, Chinese, or Japanese — then simply speak. The AI listens, responds naturally, and adapts to your level. No scripted lessons. Just conversation.`
- Keywords: `language,learning,AI,Spanish,French,conversation,coach,voice`
- Support URL: `https://lun-ai.vercel.app`
- Privacy Policy URL: `https://lun-ai.vercel.app/privacy` (from Step 2)
- Select the TestFlight build from Task 8
- Click "Submit for Review"

Expected: reviewed in 1–2 weeks. Apple may request clarification on microphone usage — refer them to the privacy policy.

- [ ] **Step 4: Update landing page CTAs**

Once the app is approved and live, update the Play Store and App Store URLs in `lun-ai-landing/index.html` with the real store links.

```bash
cd lun-ai-landing
# Edit index.html — replace placeholder URLs with real store URLs
git add index.html
git commit -m "fix: update store links with live URLs"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Branding update (Tasks 1–2)
- ✅ Landing page (Task 3)
- ✅ Android TWA + assetlinks.json (Tasks 4–5)
- ✅ iOS Capacitor project (Task 6)
- ✅ Speech bridge — 3-branch detection (Task 7)
- ✅ Codemagic CI (Task 8)
- ✅ App Store submission + privacy policy (Task 9)
- ✅ Bundle ID `ai.lun.app` used consistently in Tasks 4, 5, 6, 7, 8, 9

**Placeholder scan:** No TBDs. The SHA-256 fingerprint in Task 4 is intentionally deferred to Task 5 (it can only be generated by PWABuilder). The App Store/Play Store URLs in the landing page are intentionally deferred to Task 9 (they don't exist yet).

**Type consistency:** `startCapacitorRecognition()` and `stopRecognition()` use `window.Capacitor.Plugins.SpeechRecognition` consistently. `pendingWSTranscript` and `triggerProcessing()` are used exactly as defined in the existing codebase.
