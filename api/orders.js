// api/orders.js  –  Vercel Serverless Function
// Handles GET (list orders) and POST (create order) via Supabase

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // server-side only key – never exposed to browser
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      // ---- List all orders (admin only) ----
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, orders: data });
    }

    if (req.method === 'POST') {
      // ---- Create a new order ----
      const { customer_email, customer_name, items, total, shipping_address } = req.body;

      if (!customer_email || !items?.length) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      // Insert order header
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_email,
          customer_name,
          total,
          shipping_address,
          status: 'pending',
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // Insert order line items
      const lineItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        price: item.price,
        quantity: item.qty || 1,
        size: item.size,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(lineItems);
      if (itemsErr) throw itemsErr;

      // Update wallet balance in Supabase
      await supabase.rpc('increment_wallet_balance', { amount: total });

      return res.status(201).json({ success: true, order });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Orders API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
