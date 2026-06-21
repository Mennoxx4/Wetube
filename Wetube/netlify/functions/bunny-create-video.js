// netlify/functions/bunny-create-video.js
// Cette fonction tourne sur le serveur Netlify, jamais dans le navigateur.
// La clé API Bunny n'est donc JAMAIS visible par les utilisateurs.

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
    const { title } = JSON.parse(event.body || '{}');

    // 1. Crée une entrée vidéo vide dans Bunny Stream
    const createRes = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: title || 'Vidéo WeTube' })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return { statusCode: createRes.status, body: JSON.stringify({ error: errText }) };
    }

    const data = await createRes.json();
    // data.guid = l'identifiant unique de la vidéo dans Bunny

    return {
      statusCode: 200,
      body: JSON.stringify({
        videoId: data.guid,
        libraryId: LIBRARY_ID
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
