// netlify/functions/bunny-upload-signature.js
// Génère une signature TUS pour permettre à l'acheteur (navigateur)
// d'uploader DIRECTEMENT vers Bunny Stream sans jamais voir la clé API.
// Bunny utilise le protocole TUS pour l'upload résumable de gros fichiers vidéo.

const crypto = require('crypto');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
  const API_KEY = process.env.BUNNY_API_KEY;

  if (!LIBRARY_ID || !API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Bunny credentials not configured on server' }) };
  }

  try {
    const { videoId, title } = JSON.parse(event.body || '{}');
    if (!videoId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'videoId requis' }) };
    }

    // Expiration de la signature : 1 heure à partir de maintenant (en secondes Unix)
    const expirationTime = Math.floor(Date.now() / 1000) + 3600;

    // Signature TUS Bunny = SHA256(libraryId + apiKey + expirationTime + videoId)
    const signatureString = `${LIBRARY_ID}${API_KEY}${expirationTime}${videoId}`;
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    return {
      statusCode: 200,
      body: JSON.stringify({
        videoId,
        libraryId: LIBRARY_ID,
        expirationTime,
        signature,
        // Infos nécessaires côté client pour configurer tus-js-client
        tusEndpoint: 'https://video.bunnycdn.com/tusupload',
        title: title || 'Vidéo WeTube'
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
