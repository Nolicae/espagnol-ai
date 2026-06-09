# Lun.ai — Distribution Design Spec

## Overview

Distribute the existing espagnol-ai PWA (now rebranded **Lun.ai**) to the widest possible audience via three channels: optimized PWA, Google Play Store (Android TWA), and Apple App Store (iOS Capacitor wrapper). A standalone landing page acts as the public entry point.

**App name:** Lun.ai  
**Bundle ID:** ai.lun.app  
**Current deployment:** https://espagnol-ai-repo.vercel.app  
**Target deployment:** https://lun-ai.vercel.app (+ lun.ai custom domain if purchased)

---

## Architecture

```
Landing page (lun-ai-landing — new Vercel project)
    ↓ links to
┌──────────────────┬──────────────────┬─────────────────────┐
│  PWA (existing)  │  Play Store APK  │   App Store IPA     │
│  Vercel          │  TWA/PWABuilder  │   Capacitor         │
│  lun-ai.vercel   │  $25 one-time    │   Codemagic + $99/yr│
└──────────────────┴──────────────────┴─────────────────────┘
```

`index.html` is the single source of truth for all three channels. No logic is duplicated.

---

## Component 1 — Branding Update (existing repo)

**Files modified:** `index.html`, `manifest.json`

### manifest.json changes
```json
{
  "name": "Lun.ai",
  "short_name": "Lun.ai",
  "description": "AI language coach — speak, listen, learn",
  "theme_color": "#181b2d",
  "background_color": "#0d0f1a"
}
```

### index.html changes
- `<title>Lun.ai</title>`
- `<meta name="description" content="AI language coach — speak, listen, learn in 8 languages">`
- `<meta property="og:title" content="Lun.ai">`
- `<meta property="og:description" content="...">`
- `<meta property="og:image" content="/icons/og-image.png">`

### Icons (new)
Generated from the lunar orb visual. Required sizes:
- `icon-192.png` — standard PWA
- `icon-512.png` — standard PWA
- `icon-512-maskable.png` — Android adaptive icon
- `apple-touch-icon.png` (180×180) — iOS home screen
- `og-image.png` (1200×630) — social sharing preview

Icons feature the glass orb on the app's dark atmospheric background.

---

## Component 2 — Landing Page (new repo: `lun-ai-landing`)

**Hosting:** New Vercel project, separate repo  
**URL:** lun-ai.vercel.app (later: lun.ai with custom domain)  
**Stack:** Single HTML file, same aesthetic as the app (no framework)

### Page sections

**Hero**
- Orbe animé (CSS pulse, same as app)
- Title: "Lun.ai"
- Tagline: "Speak. Listen. Learn." or "Your AI language coach"
- CTA buttons: "Get on Google Play" · "Download on App Store" · "Open in browser →"

**Languages**
- 8 language orbs (same lunar-phase glass spheres from the app)
- Language names below each

**How it works**
- 3 steps: Choose a language → Press the orb → Speak naturally

**Footer**
- Link to web app, privacy policy placeholder, GitHub (optional)

---

## Component 3 — Android Play Store (TWA)

**Tool:** PWABuilder (pwbuilder.net — free, by Microsoft)  
**Wrapper type:** Trusted Web Activity (TWA) — Chrome loads the Vercel URL natively  
**Cost:** $25 one-time Google Play developer account

### Technical requirements

**`/.well-known/assetlinks.json`** added to Vercel project:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "ai.lun.app",
    "sha256_cert_fingerprints": ["<fingerprint from PWABuilder>"]
  }
}]
```

This file proves domain ownership and enables the TWA to run without the browser chrome.

### Store listing requirements
- App icon (512×512)
- Feature graphic (1024×500)
- 2–8 screenshots (phone, 16:9 or 9:16)
- Short description (80 chars max)
- Full description (4000 chars max)
- Content rating questionnaire

### Web Speech API
Works natively — TWA uses Chrome as its engine, full Web Speech API support.

---

## Component 4 — iOS App Store (Capacitor)

**Tool:** Capacitor (Ionic) — wraps index.html in a WKWebView native iOS app  
**CI/CD:** Codemagic (free tier: 500 build minutes/month)  
**Cost:** $99/year Apple Developer account

### New repo: `lun-ai-ios`

```
lun-ai-ios/
├── ios/                    ← Capacitor-generated Xcode project
├── src/
│   └── index.html          ← symlink or copy of production build
├── capacitor.config.json
└── package.json
```

### capacitor.config.json
```json
{
  "appId": "ai.lun.app",
  "appName": "Lun.ai",
  "webDir": "src",
  "server": {
    "hostname": "lun-ai.vercel.app",
    "androidScheme": "https"
  }
}
```

### Speech recognition bridge

**Problem:** `webkitSpeechRecognition` is unavailable in WKWebView (iOS WebView engine).

**Solution:** `@capacitor-community/speech-recognition` plugin uses native `SFSpeechRecognizer`.

**Detection logic added to `index.html`** (one new branch in the existing speech setup):

```javascript
function initSpeechRecognition() {
  if (window.Capacitor?.isNativePlatform()) {
    // Native iOS speech via Capacitor plugin
    return initCapacitorSpeech();
  } else if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    // Web Speech API (Chrome, Edge, Safari PWA)
    return initWebSpeech(); // existing code
  } else {
    // Groq Whisper fallback (already implemented)
    return initGroqFallback(); // existing code
  }
}
```

`initCapacitorSpeech()` mirrors the Web Speech API interface: starts listening, fires `handleSpeechResult()` on final results, respects `speakToken` for interruption.

### Codemagic setup
- Connect GitHub repo `lun-ai-ios`
- iOS workflow: install deps → cap sync → archive → sign → upload to App Store Connect
- Signing: Codemagic manages provisioning profiles and certificates via App Store Connect API key

### App Store listing requirements
- App icon (1024×1024, no alpha)
- 3–10 screenshots per device size (iPhone 6.7", 6.1", iPad if desired)
- App Preview video (optional but recommended)
- Short description, keywords, support URL, privacy policy URL

### Privacy policy
Required by Apple. Minimum: one-page policy hosted on lun-ai.vercel.app/privacy covering microphone usage and data handling.

---

## Execution Sequence

| Step | Task | Time estimate | Cost |
|------|------|---------------|------|
| 1 | Branding update (manifest, title, meta tags) | 30 min | — |
| 2 | Generate icons (192, 512, maskable, og-image) | 1h | — |
| 3 | Landing page (new repo + Vercel deploy) | 2–3h | — |
| 4 | Android: PWABuilder + assetlinks.json + Play Store submission | 2h | $25 |
| 5 | iOS: Capacitor project + speech bridge in index.html | 3–4h | — |
| 6 | iOS: Codemagic setup + first build | 1–2h | — |
| 7 | iOS: App Store submission + privacy policy page | 1h | $99/yr |

**Review times (out of our control):**
- Google Play: ~3 days
- Apple App Store: ~1–2 weeks

---

## Constraints & Decisions

- **No backend changes** — all API keys stay in Vercel env vars, unchanged
- **index.html stays as source of truth** — Capacitor loads it, TWA loads the live URL
- **Groq/HuggingFace free tiers** — sufficient for a small community; monitor usage if the app gains traction
- **lun.ai domain** — optional but recommended; check availability on Namecheap before proceeding
- **App name on stores** — "Lun.ai" (with dot); bundle ID `ai.lun.app`
