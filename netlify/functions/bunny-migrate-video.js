// netlify/functions/bunny-migrate-video.js
// Fonction à usage UNIQUE pour migrer une vidéo déjà stockée sur Firebase
// vers Bunny Stream, en utilisant "Upload Video from URL" (pas besoin de
// re-télécharger/uploader manuellement, Bunny récupère le fichier directement
// depuis l'URL Firebase existante).

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
    const { firebaseVideoUrl, title } = JSON.parse(event.body || '{}');
    if (!firebaseVideoUrl) {
      return { statusCode: 400, body: JSON.stringify({ error: 'firebaseVideoUrl requis' }) };
    }

    // 1. Crée l'entrée vidéo vide
    const createRes = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`, {
      method: 'POST',
      headers: { 'AccessKey': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || 'Vidéo migrée' })
    });
    if (!createRes.ok) {
      const errText = await createRes.text();
      return { statusCode: createRes.status, body: JSON.stringify({ error: errText }) };
    }
    const created = await createRes.json();
    const videoId = created.guid;

    // 2. Demande à Bunny de FETCH le fichier directement depuis l'URL Firebase
    // (Bunny télécharge lui-même, pas besoin de faire transiter le fichier par le navigateur)
    const fetchRes = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}/fetch`, {
      method: 'POST',
      headers: { 'AccessKey': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: firebaseVideoUrl })
    });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      return { statusCode: fetchRes.status, body: JSON.stringify({ error: errText }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        videoId,
        libraryId: LIBRARY_ID,
        message: 'Migration démarrée, le traitement peut prendre quelques minutes'
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
