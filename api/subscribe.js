import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lfnlkejbwgvqhqrnleif.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmbmxrZWpid2d2cWhxcm5sZWlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDI1MjcxMywiZXhwIjoyMTA5ODI4NzEzfQ.VysoknEJrNvGn-yXLeZiN3YgZt7UXNWLPg0NnxOKsQ0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });

  try {
    const { error } = await supabase.from('subscribers').upsert({ email }, { onConflict: 'email' });
    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Subscribed successfully!' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
