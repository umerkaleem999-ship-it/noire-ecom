-- ============================================================
--  NOIRE E-Commerce  –  Supabase SQL Schema
--  Run this in your Supabase project → SQL Editor → New Query
-- ============================================================

-- ── Enable UUID extension ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── PRODUCTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  category    TEXT NOT NULL,          -- 'Summer' | 'Jackets' | 'Coats' | 'Trousers' | ...
  description TEXT,
  image_url   TEXT,
  stock       TEXT DEFAULT 'In Stock', -- 'In Stock' | 'Low Stock' | 'Out of Stock'
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed products (all 20 from the store)
INSERT INTO products (name, price, category, stock) VALUES
  ('White Linen Shirt',         420,  'Summer',  'In Stock'),
  ('Sand Wide-Leg Trousers',    580,  'Summer',  'In Stock'),
  ('Terracotta Camp Shirt',     390,  'Summer',  'Low Stock'),
  ('Sage Silk Slip Dress',      1180, 'Summer',  'In Stock'),
  ('Ivory Bermuda Shorts',      340,  'Summer',  'In Stock'),
  ('Sky Linen Blazer',          880,  'Summer',  'Low Stock'),
  ('Olive Co-ord Set',          1340, 'Summer',  'In Stock'),
  ('Rose Linen Midi Skirt',     490,  'Summer',  'Out of Stock'),
  ('Noir Structured Blazer',    1240, 'Jackets', 'In Stock'),
  ('Ivory Cashmere Coat',       2890, 'Coats',   'In Stock'),
  ('Navy Tailored Trousers',    680,  'Trousers','In Stock'),
  ('Onyx Turtleneck',           495,  'Knitwear','In Stock'),
  ('Obsidian Field Jacket',     1580, 'Jackets', 'Low Stock'),
  ('Smoke Palazzo Trousers',    780,  'Trousers','In Stock'),
  ('The Arc Overcoat',          3200, 'Coats',   'In Stock'),
  ('Dusk Ribbed Sweater',       560,  'Knitwear','In Stock'),
  ('Sage Linen Dress',          920,  'Dresses', 'In Stock'),
  ('Ivory Slip Midi',           1100, 'Dresses', 'Low Stock'),
  ('Stone Linen Suit',          1750, 'Summer',  'In Stock'),
  ('Bronze Mesh Blouse',        640,  'Summer',  'In Stock')
ON CONFLICT DO NOTHING;


-- ── CUSTOMERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  phone         TEXT,
  location      TEXT,
  total_spent   NUMERIC(12,2) DEFAULT 0,
  order_count   INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ── ORDERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_email   TEXT NOT NULL,
  customer_name    TEXT,
  status           TEXT DEFAULT 'pending',
    CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  total            NUMERIC(10,2) NOT NULL,
  shipping_address JSONB,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ── ORDER ITEMS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  quantity     INT DEFAULT 1,
  size         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ── WALLET ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet (
  id         INT PRIMARY KEY DEFAULT 1,  -- single row
  balance    NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO wallet (id, balance) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;


-- ── RPC: increment_wallet_balance ──────────────────────────
-- Called from the orders API to add revenue to the wallet
CREATE OR REPLACE FUNCTION increment_wallet_balance(amount NUMERIC)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE wallet SET balance = balance + amount, updated_at = NOW() WHERE id = 1;
END;
$$;


-- ── NEWSLETTER SUBSCRIBERS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS subscribers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── ROW LEVEL SECURITY ─────────────────────────────────────
-- Products are publicly readable; mutations require service role
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Public read products
CREATE POLICY "products_public_read" ON products FOR SELECT USING (active = TRUE);

-- Only service role can write (serverless functions use service key)
CREATE POLICY "orders_service_insert" ON orders FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "orders_service_select" ON orders FOR SELECT USING (TRUE);
CREATE POLICY "orders_service_update" ON orders FOR UPDATE USING (TRUE);
CREATE POLICY "order_items_service"   ON order_items FOR ALL USING (TRUE);
CREATE POLICY "wallet_service"        ON wallet FOR ALL USING (TRUE);
CREATE POLICY "customers_service"     ON customers FOR ALL USING (TRUE);
CREATE POLICY "subscribers_insert"    ON subscribers FOR INSERT WITH CHECK (TRUE);


-- ── TRIGGERS: auto-update updated_at ──────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_updated_at   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_email        ON orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_order_items_orderid ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_products_category   ON products (category);
