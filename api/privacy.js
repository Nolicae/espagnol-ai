export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Politique de confidentialité — Lun.ai</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #222; line-height: 1.7; }
  h1 { color: #1a1f3a; } h2 { color: #333; margin-top: 2em; }
  a { color: #4f6ef7; }
</style>
</head>
<body>
<h1>Politique de confidentialité</h1>
<p><strong>Application :</strong> Lun.ai &nbsp;|&nbsp; <strong>Dernière mise à jour :</strong> juin 2026</p>

<h2>1. Données collectées</h2>
<p>Lun.ai ne crée pas de compte utilisateur et ne stocke aucune donnée personnelle identifiable sur nos serveurs.</p>
<p>Lors d'une session de conversation :</p>
<ul>
  <li>Votre voix est enregistrée localement puis transmise à <strong>Groq</strong> (groq.com) pour transcription via le modèle Whisper. Groq ne conserve pas les données audio après traitement.</li>
  <li>Le texte transcrit est envoyé à un modèle de langage (LLM) pour générer une réponse. Aucun historique n'est conservé entre les sessions.</li>
  <li>La réponse est envoyée à un service de synthèse vocale hébergé sur Hugging Face Spaces pour être lue à voix haute.</li>
</ul>

<h2>2. Données stockées localement</h2>
<p>Les préférences de l'utilisateur (langue, niveau, voix sélectionnée) sont enregistrées dans le <em>localStorage</em> de votre appareil. Ces données ne quittent jamais votre appareil et peuvent être effacées à tout moment en vidant les données de l'application.</p>

<h2>3. Services tiers</h2>
<ul>
  <li><a href="https://groq.com/privacy" target="_blank">Groq — Politique de confidentialité</a> (transcription vocale)</li>
  <li><a href="https://vercel.com/legal/privacy-policy" target="_blank">Vercel — Politique de confidentialité</a> (hébergement)</li>
  <li><a href="https://huggingface.co/privacy" target="_blank">Hugging Face — Politique de confidentialité</a> (synthèse vocale)</li>
</ul>

<h2>4. Mineurs</h2>
<p>L'application ne collecte pas sciemment de données personnelles auprès de personnes de moins de 13 ans.</p>

<h2>5. Droits des utilisateurs</h2>
<p>Aucune donnée personnelle n'étant stockée, il n'y a pas de données à consulter, modifier ou supprimer. Pour toute question, contactez-nous à l'adresse ci-dessous.</p>

<h2>6. Contact</h2>
<p><a href="mailto:nostradamuslincoln@gmail.com">nostradamuslincoln@gmail.com</a></p>
</body>
</html>`);
}
