# Lun.ai — Métadonnées Google Play Store

---

## Infos de base

| Champ | Valeur |
|---|---|
| Nom de l'app | Lun.ai |
| Package | ai.lun.app |
| Catégorie | Éducation |
| Tags | apprentissage des langues, IA, conversation |
| Notation de contenu | Tous publics (PEGI 3) |
| Prix | Gratuit |

---

## Titre (30 car. max)

```
Lun.ai
```

---

## Description courte (80 car. max)

```
Parle avec une IA native. Apprends l'espagnol, le français, l'arabe et plus.
```

---

## Description complète (4000 car. max)

```
Lun.ai est ton compagnon de conversation IA pour apprendre les langues en parlant vraiment — pas en remplissant des exercices.

🎙️ PARLE, PAS TAPER
Lance une session, parle dans le micro, et l'IA te répond à voix haute dans la langue cible. Zéro clavier, zéro QCM. Juste de la conversation naturelle.

🌍 6 LANGUES DISPONIBLES
• Espagnol — 12 voix régionales (Mexique, Espagne, Argentine…)
• Portugais — 5 voix (Brésil, Portugal)
• Français — voix natives
• Arabe — 16 dialectes
• Chinois mandarin
• Japonais

🧠 ADAPTÉ À TON NIVEAU
Choisis ton niveau (Débutant, Intermédiaire, Avancé) et l'IA adapte automatiquement son vocabulaire, sa vitesse et la complexité de ses réponses.

🗺️ EXPLORE LES CULTURES
Chaque langue s'accompagne d'une carte interactive des pays, de faits culturels et de personnages historiques associés aux voix.

⚡ RÉPONSES INSTANTANÉES
Pipeline optimisé : transcription vocale → IA → synthèse vocale en moins de 2 secondes.

🔒 SANS COMPTE
Aucune inscription, aucun abonnement. Lance l'app et commence à parler.

Lun.ai est une Progressive Web App (PWA) — elle fonctionne directement dans Chrome, sans installation supplémentaire de composants.
```

---

## Politique de confidentialité

À héberger à une URL publique (ex: `https://lun-ai.vercel.app/privacy`) — contenu ci-dessous.

```
Politique de confidentialité — Lun.ai
Dernière mise à jour : juin 2026

1. Données collectées
Lun.ai ne crée pas de compte utilisateur et ne stocke aucune donnée personnelle identifiable.

Lors d'une session de conversation :
- Votre voix est enregistrée localement puis envoyée à Groq (groq.com) pour transcription (Whisper). Groq ne conserve pas les données audio après traitement.
- Le texte transcrit est envoyé à un LLM (Claude/Anthropic ou équivalent) pour générer une réponse. Aucun historique n'est conservé entre les sessions.
- La réponse texte est envoyée à un service de synthèse vocale (Hugging Face Spaces) pour être lue à voix haute.

2. Données stockées localement
Les préférences (langue, niveau, voix choisie) sont stockées dans le localStorage de votre navigateur. Elles ne quittent jamais votre appareil.

3. Services tiers
- Groq (transcription) : groq.com/privacy
- Vercel (hébergement) : vercel.com/legal/privacy-policy
- Hugging Face (synthèse vocale) : huggingface.co/privacy

4. Mineurs
L'application ne collecte pas de données sur les mineurs.

5. Contact
nostradamuslincoln@gmail.com
```

---

## Captures d'écran requises

Google Play exige **au moins 2 captures** (format téléphone : 1080×1920 ou 9:16).

Scènes à capturer dans l'app :
1. **Écran d'accueil** — sélection de langue (les 6 drapeaux)
2. **Session en cours** — orbe animé + indicateur d'écoute
3. **Carte des voix** — carte géographique avec les régions
4. **Paramètres** — sélection de niveau + voix

→ Lance l'app sur Chrome mobile (ou DevTools en vue mobile 390×844) et fais des screenshots.

---

## Graphic de présentation (Feature Graphic)

Format : **1024×500 px**

Suggestion visuelle :
- Fond dégradé #0d0f1a → #1a1f3a
- Logo "Lun.ai" centré en blanc
- Sous-titre : "Parle. Apprends. Instantanément."
- 6 drapeaux des langues disponibles en bas

---

## Questionnaire de notation IARC (contenu)

| Question | Réponse |
|---|---|
| Violence | Non |
| Contenu sexuel | Non |
| Langage grossier | Non |
| Achats intégrés | Non |
| Partage de localisation | Non |
| Accès micro | Oui (fonctionnalité principale) |
| Contenu généré par l'utilisateur | Non |

→ Résultat attendu : **PEGI 3 / Everyone**

---

## Checklist avant soumission

- [ ] Compte Google Play Developer authentifié (pièce d'identité)
- [ ] AAB téléchargé depuis GitHub Actions artifact
- [ ] Politique de confidentialité hébergée à une URL publique
- [ ] 2+ captures d'écran téléphone
- [ ] Feature graphic 1024×500
- [ ] Icône 512×512 (→ `icons/icon-512.png` du repo)
