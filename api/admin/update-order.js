import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lfnlkejbwgvqhqrnleif.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmbmxrZWpid2d2cWhxcm5sZWlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDI1MjcxMywiZXhwIjoyMTA5ODI4NzEzfQ.VysoknEJrNvGn-yXLeZiN3YgZt7UXNWLPg0NnxOKsQ0';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'noire_secure_admin_portal_secret_key_2026_987654321';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  if (req.headers.authorization !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id, status } = req.body || {};
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, order: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
