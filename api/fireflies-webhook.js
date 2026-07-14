export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { meetingId } = req.body;
  if (!meetingId) {
    return res.status(400).json({ error: 'No meetingId provided.' });
  }

  const FIREFLIES_KEY = process.env.FIREFLIES_API_KEY;
  const SUPABASE_URL = 'https://xjpdarzduikzstmrlgwp.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_eqncVVsKRSRsdkfmpx055Q_adi4s2E8';

  try {
    const query = `query($id: String!) { transcript(id: $id) { id title date meeting_attendees { displayName email } sentences { speaker_name text } summary { overview } } }`;
    const ffRes = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + FIREFLIES_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables: { id: meetingId } })
    });
    const ffData = await ffRes.json();
    const transcript = ffData.data && ffData.data.transcript;
    if (!transcript) {
      return res.status(400).json({ error: 'Could not fetch transcript from Fireflies.' });
    }

    const attendees = transcript.meeting_attendees || [];
    let matchedClientId = null;
    for (const a of attendees) {
      if (!a.email) continue;
      const clientRes = await fetch(SUPABASE_URL + '/rest/v1/clients?email=eq.' + encodeURIComponent(a.email) + '&select=id', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
      });
      const clientData = await clientRes.json();
      if (clientData && clientData.length) {
        matchedClientId = clientData[0].id;
        break;
      }
    }

    const transcriptText = (transcript.sentences || []).map(s => (s.speaker_name || 'Speaker') + ': ' + s.text).join('\n');

    const saveRes = await fetch(SUPABASE_URL + '/rest/v1/consultation_transcripts', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        client_id: matchedClientId,
        fireflies_id: transcript.id,
        meeting_date: transcript.date ? new Date(transcript.date).toISOString().split('T')[0] : null,
        title: transcript.title || null,
        transcript_text: transcriptText,
        summary: transcript.summary ? transcript.summary.overview : null
      })
    });

    if (!saveRes.ok) {
      const errData = await saveRes.json();
      console.error('Supabase insert error:', errData);
      return res.status(500).json({ error: 'Failed to save transcript.' });
    }

    res.status(200).json({ success: true, matched: !!matchedClientId });
  } catch (error) {
    console.error('Fireflies webhook error:', error);
    res.status(500).json({ error: 'Something went wrong processing this transcript.' });
  }
}
