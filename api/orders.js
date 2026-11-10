import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lfnlkejbwgvqhqrnleif.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmbmxrZWpid2d2cWhxcm5sZWlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDI1MjcxMywiZXhwIjoyMTA5ODI4NzEzfQ.VysoknEJrNvGn-yXLeZiN3YgZt7UXNWLPg0NnxOKsQ0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, orders: data });
    }

    if (req.method === 'POST') {
      const { customer_email, customer_name, items, total, shipping_address } = req.body || {};

      if (!customer_email || !items?.length) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_email,
          customer_name: customer_name || 'Customer',
          total: Number(total) || 0,
          shipping_address: shipping_address || {},
          status: 'pending',
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      const lineItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id && item.id.length === 36 ? item.id : null,
        product_name: item.name || 'Product',
        price: Number(item.price) || 0,
        quantity: Number(item.qty) || 1,
        size: item.size || 'M',
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(lineItems);
      if (itemsErr) console.warn('Items insert warning:', itemsErr.message);

      try {
        await supabase.rpc('increment_wallet_balance', { amount: Number(total) || 0 });
      } catch (wErr) {
        console.warn('Wallet RPC notice:', wErr.message);
      }

      return res.status(201).json({ success: true, order });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Orders API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
