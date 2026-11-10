// js/api.js  –  Frontend Supabase client + API helpers
// Loaded by both index.html and admin.html

// ── Supabase public (anon) credentials ───────────────────
// These are SAFE to expose in the frontend (anon key has RLS restrictions)
const SUPABASE_URL     = 'https://lfnlkejbwgvqhqrnleif.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmbmxrZWpid2d2cWhxcm5sZWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNTI3MTMsImV4cCI6MjEwOTgyODcxM30.GS4kP9j5yFhorCuad5eNZFv0p9hzYexG0S9du_7ymeg';

// ── API base (Vercel serverless functions) ────────────────
const API_BASE = window.location.origin;   // same domain on Vercel

// ══════════════════════════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════════════════════════
async function fetchProducts(category = 'all') {
  try {
    const url = category === 'all'
      ? `${API_BASE}/api/products`
      : `${API_BASE}/api/products?category=${encodeURIComponent(category)}`;
    const res = await fetch(url);
    const json = await res.json();
    return json.products || [];
  } catch (e) {
    console.warn('API unavailable, using local data', e);
    return null;   // caller falls back to hardcoded products
  }
}

// ══════════════════════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════════════════════
async function placeOrder(orderData) {
  // orderData = { customer_email, customer_name, items, total, shipping_address }
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    // Also persist locally for instant offline UI
    const local = JSON.parse(localStorage.getItem('noire_orders') || '[]');
    local.unshift({ ...json.order, product: orderData.items[0]?.name, price: orderData.total, status: 'pending', date: new Date().toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}), customer: orderData.customer_name, size: orderData.items[0]?.size || 'M', img: orderData.items[0]?.img || '' });
    localStorage.setItem('noire_orders', JSON.stringify(local));

    return json.order;
  } catch (e) {
    console.error('Order placement failed:', e);
    throw e;
  }
}

async function fetchOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders`);
    const json = await res.json();
    return json.orders || [];
  } catch (e) {
    return JSON.parse(localStorage.getItem('noire_orders') || '[]');
  }
}

async function updateOrderStatus(orderId, status, adminSecret) {
  const res = await fetch(`${API_BASE}/api/admin/update-order`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminSecret}`,
    },
    body: JSON.stringify({ id: orderId, status }),
  });
  return res.json();
}

// ══════════════════════════════════════════════════════════
//  WALLET
// ══════════════════════════════════════════════════════════
async function fetchWallet() {
  try {
    const res = await fetch(`${API_BASE}/api/wallet`);
    return res.json();
  } catch (e) {
    return { wallet: { balance: 0 }, transactions: [] };
  }
}

// ══════════════════════════════════════════════════════════
//  NEWSLETTER SUBSCRIBE
// ══════════════════════════════════════════════════════════
async function subscribeEmail(email) {
  try {
    const res = await fetch(`${API_BASE}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Export for module usage
if (typeof window !== 'undefined') {
  window.NoireAPI = { fetchProducts, placeOrder, fetchOrders, updateOrderStatus, fetchWallet, subscribeEmail };
}
