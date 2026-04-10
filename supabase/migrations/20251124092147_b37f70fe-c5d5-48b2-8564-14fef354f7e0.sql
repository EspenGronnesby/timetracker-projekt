-- Create favorite addresses table
CREATE TABLE IF NOT EXISTS favorite_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'custom',
  icon VARCHAR(50) DEFAULT '📍',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_favorite_addresses_user ON favorite_addresses(user_id);

-- Enable RLS
ALTER TABLE favorite_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own favorites"
  ON favorite_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON favorite_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites"
  ON favorite_addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorite_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_favorite_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER favorite_addresses_updated_at
  BEFORE UPDATE ON favorite_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_favorite_addresses_updated_at();