export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = 'https://xjpdarzduikzstmrlgwp.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Require a logged-in staff member to call this endpoint
  const callerToken = (req.headers.authorization || '').replace('Bearer ', '');
  if (!callerToken) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  const callerRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + callerToken }
  });
  const caller = await callerRes.json();
  if (!callerRes.ok || !caller.email) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  const staffCheck = await fetch(SUPABASE_URL + '/rest/v1/Staff?Email=eq.' + encodeURIComponent(caller.email) + '&select=Email', {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
  });
  const staffMatch = await staffCheck.json();
  if (!Array.isArray(staffMatch) || !staffMatch.length) {
    return res.status(403).json({ error: 'Staff access only.' });
  }

  const { email, password, full_name, menopause_stage, date_of_birth, phone, plan_start_date } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full name are required.' });
  }

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
        phone: phone || null,
        plan_start_date: plan_start_date || null
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
