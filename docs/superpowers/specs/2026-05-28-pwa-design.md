# PWA Espagnolai — Design Spec
Date: 2026-05-28

## Objectif
Rendre Espagnolai installable sur iPhone (et Android) en Web App/PWA, sans changer le comportement actuel.

## Scope
- iOS: installable via Safari "Ajouter à l'écran d'accueil"
- Android: PWA complète via Service Worker
- Pas de offline support (l'app nécessite Internet pour fonctionner)
- Pas de push notifications, pas de background sync
- Comportement fonctionnel identique à aujourd'hui

## Fichiers modifiés
### `index.html`
Ajouter dans `<head>`:
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Espagnolai">
<link rel="apple-touch-icon" href="icons/icon.svg">
```
Ajouter avant `</body>`: enregistrement du Service Worker.

### `service-worker.js` (nouveau)
Stratégie de cache:
- **Cache first** pour les assets statiques: `index.html`, fonts Google, `icons/icon.svg`
- **Network first** pour les APIs dynamiques: `/api/tts`, `api.groq.com`
- Versioning du cache via constante `CACHE_NAME` — à incrémenter à chaque déploiement majeur

## Déploiement
Identique à aujourd'hui: `git push` → Vercel déploie automatiquement.
Le SW se met à jour au prochain chargement de l'app par l'utilisateur.

## Ce qu'on ne fait PAS
- Pas de page offline
- Pas de background sync
- Pas de push notifications
- Pas de modification de la logique métier
