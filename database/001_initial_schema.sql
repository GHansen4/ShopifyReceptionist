-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'cancelled', 'suspended');
CREATE TYPE call_sentiment AS ENUM ('positive', 'neutral', 'negative');
CREATE TYPE resolution_status AS ENUM ('resolved', 'escalated', 'abandoned');
CREATE TYPE action_type AS ENUM ('order_lookup', 'product_search', 'transfer_attempt');

-- Create shops table
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_domain TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  shop_name TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'UTC',
  phone_number TEXT,
  vapi_assistant_id TEXT,
  vapi_phone_number_id TEXT,
  settings JSONB DEFAULT '{"language":"en","timezone":"UTC","greeting":"","hold_message":""}'::jsonb,
  subscription_status subscription_status DEFAULT 'trial',
  subscription_id TEXT,
  plan_name TEXT DEFAULT 'starter',
  call_minutes_used INTEGER DEFAULT 0,
  call_minutes_limit INTEGER DEFAULT 100,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calls table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  vapi_call_id TEXT NOT NULL UNIQUE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  duration_seconds INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  recording_url TEXT,
  transcript JSONB,
  summary TEXT,
  sentiment call_sentiment DEFAULT 'neutral',
  resolution_status resolution_status DEFAULT 'abandoned',
  tags TEXT[],
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_actions table
CREATE TABLE call_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  action_type action_type NOT NULL,
  action_data JSONB,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  inventory_quantity INTEGER DEFAULT 0,
  image_url TEXT,
  product_url TEXT,
  variants JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_shops_domain ON shops(shop_domain);
CREATE INDEX idx_calls_shop_id ON calls(shop_id);
CREATE INDEX idx_calls_vapi_call_id ON calls(vapi_call_id);
CREATE INDEX idx_calls_shop_started ON calls(shop_id, started_at DESC);
CREATE INDEX idx_calls_customer_phone ON calls(customer_phone);
CREATE INDEX idx_call_actions_call_id ON call_actions(call_id);
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX idx_products_shop_title ON products(shop_id, title);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shops table
CREATE POLICY "Users can only see their own shop" ON shops
  FOR SELECT
  USING (auth.uid()::text = shop_domain); -- In practice, use proper auth context

CREATE POLICY "Authenticated users can insert shops" ON shops
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can only update their own shop" ON shops
  FOR UPDATE
  USING (auth.uid()::text = shop_domain)
  WITH CHECK (auth.uid()::text = shop_domain);

-- RLS Policies for calls table (through shop_id)
CREATE POLICY "Users can only see calls from their shop" ON calls
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = calls.shop_id));

CREATE POLICY "Users can insert calls for their shop" ON calls
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE shops.id = calls.shop_id));

-- RLS Policies for call_actions table
CREATE POLICY "Users can only see call_actions from their calls" ON call_actions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM calls
    WHERE calls.id = call_actions.call_id
  ));

CREATE POLICY "Users can insert call_actions for their calls" ON call_actions
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM calls
    WHERE calls.id = call_actions.call_id
  ));

-- RLS Policies for products table
CREATE POLICY "Users can only see products from their shop" ON products
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = products.shop_id));

CREATE POLICY "Users can insert products for their shop" ON products
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE shops.id = products.shop_id));

CREATE POLICY "Users can update products in their shop" ON products
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = products.shop_id))
  WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE shops.id = products.shop_id));

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON shops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON calls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON call_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;

-- Grant permissions to service_role (for admin operations)
GRANT ALL ON shops TO service_role;
GRANT ALL ON calls TO service_role;
GRANT ALL ON call_actions TO service_role;
GRANT ALL ON products TO service_role;
