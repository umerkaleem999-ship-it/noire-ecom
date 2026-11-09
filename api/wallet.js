// api/wallet.js  –  Vercel Serverless Function
// Returns wallet balance and transaction history from Supabase

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Get wallet row (there's only one)
    const { data: wallet, error: walletErr } = await supabase
      .from('wallet')
      .select('*')
      .eq('id', 1)
      .single();
    if (walletErr) throw walletErr;

    // Get recent transactions (from orders)
    const { data: transactions, error: txnErr } = await supabase
      .from('orders')
      .select('id, total, status, created_at, customer_name, customer_email')
      .order('created_at', { ascending: false })
      .limit(50);
    if (txnErr) throw txnErr;

    return res.status(200).json({
      success: true,
      wallet: { balance: wallet.balance, updated_at: wallet.updated_at },
      transactions,
    });
  } catch (err) {
    console.error('Wallet API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
