// api/products.js  –  Vercel Serverless Function
// CRUD operations for products (admin protected)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { category } = req.query;
      let query = supabase.from('products').select('*').eq('active', true);
      if (category && category !== 'all') query = query.eq('category', category);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ success: true, products: data });
    }

    // Admin-only: require service key in Authorization header for mutations
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      const { data, error } = await supabase.from('products').insert(req.body).select().single();
      if (error) throw error;
      return res.status(201).json({ success: true, product: data });
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json({ success: true, product: data });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const { error } = await supabase.from('products').update({ active: false }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Product deactivated' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Products API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
