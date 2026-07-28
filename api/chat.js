export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;

  try {
    // NEW: Pull the knowledge base from Supabase before calling Claude
    let knowledgeContext = '';
    try {
      const kbRes = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/knowledge_base?select=topic,category,source_type,content,source`,
        {
          headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + process.env.SUPABASE_ANON_KEY
          }
        }
      );
      const kbData = await kbRes.json();
      if (Array.isArray(kbData) && kbData.length) {
        knowledgeContext = kbData.map(row =>
          `[${row.category} — ${row.topic}] (${row.source_type === 'conventional' ? 'Conventional medical perspective' : 'Root-cause / functional perspective'}, source: ${row.source})\n${row.content}`
        ).join('\n\n---\n\n');
      }
    } catch (kbError) {
      console.error('Knowledge base fetch error:', kbError);
      // Continue without knowledge base rather than failing the whole chat
    }

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
        system: `You are Thrive, a warm and supportive health coaching assistant for Healthy Innovations, specialising in midlife women's health and menopause.

Use the following knowledge base as your primary reference for clinical and protocol information. Where content is tagged "Root-cause / functional perspective," this reflects Shelley's IHP/functional medicine framework and should be your default lens. Where content is tagged "Conventional medical perspective," present it as the mainstream medical view when relevant or when a client asks about conventional options like MHT/HRT — don't blend it silently into root-cause advice, name it as the conventional view.

KNOWLEDGE BASE:
${knowledgeContext}

Always recommend clients consult their doctor or Shelley directly for personalised medical decisions, especially around hormone therapy, supplements, and diagnosed conditions.`,
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
