export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { businessName, businessType, promotion, networks, tone } = req.body;

  if (!businessName || !businessType || !promotion || !networks?.length) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada en Vercel' });
  }

  const prompt = `Eres un experto en marketing de contenidos para redes sociales en Latinoamérica.

Genera posts para las siguientes redes: ${networks.join(', ')}.

Datos del negocio:
- Nombre: ${businessName}
- Tipo: ${businessType}
- Qué promocionar: ${promotion}
- Tono: ${tone}

Para CADA red social genera un objeto JSON con exactamente estos campos:
- network: nombre de la red (instagram, tiktok o facebook)
- caption: el texto completo del post adaptado al estilo de esa red
- hashtags: entre 5 y 10 hashtags relevantes separados por espacio
- visual_idea: una idea concreta de qué imagen o video hacer (1-2 oraciones)

Responde SOLO con un array JSON válido, sin texto adicional, sin backticks, sin markdown. Ejemplo:
[{"network":"instagram","caption":"...","hashtags":"#tag1 #tag2","visual_idea":"..."}]`;

  try {
    const response = await fetch(
      \`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${apiKey}\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1500 }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Error de Gemini API');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const posts = JSON.parse(clean);

    return res.status(200).json({ posts });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
