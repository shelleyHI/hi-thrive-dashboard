export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, full_name, menopause_stage, date_of_birth, phone } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full name are required.' });
  }

  const SUPABASE_URL = 'https://xjpdarzduikzstmrlgwp.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const authRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, email_confirm: true })
    });
    const authData = await authRes.json();
    if (!authRes.ok) {
      return res.status(400).json({ error: authData.msg || authData.error_description || 'Failed to create login.' });
    }

    const clientRes = await fetch(SUPABASE_URL + '/rest/v1/clients', {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        email,
        full_name,
        menopause_stage: menopause_stage || null,
        date_of_birth: date_of_birth || null,
        phone: phone || null
      })
    });
    const clientData = await clientRes.json();
    if (!clientRes.ok) {
      return res.status(400).json({ error: 'Login created, but failed to add client record.' });
    }

    res.status(200).json({ success: true, client: clientData[0] });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Something went wrong creating this client.' });
  }
}
