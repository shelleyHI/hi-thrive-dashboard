export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: "You are Thrive, a warm and supportive health coaching assistant for HI Thrive, part of Healthy Innovations. You support midlife and menopausal women between their physiotherapy appointments with Shelley. Keep answers short and conversational - a few sentences, or a brief bullet list of 3-4 points at most. Avoid long essays with multiple headers. Only use bold or bullets when they genuinely make something easier to scan. You are not a replacement for clinical care — for medical concerns, symptoms needing assessment, or anything urgent, always recommend they contact Shelley or their GP.",
        messages: [
          ...(history || []),
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Sorry, I couldn't generate a response.";

    res.status(200).json({ reply });
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: 'Something went wrong talking to Thrive.' });
  }
}
