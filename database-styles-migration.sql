-- Styles Table - For Style Library Feature
-- Allows users to create and use custom styles, plus access public styles

CREATE TABLE IF NOT EXISTS styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt_suffix TEXT NOT NULL,
  preview_image_url TEXT,
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_styles_user ON styles(user_id);
CREATE INDEX IF NOT EXISTS idx_styles_public ON styles(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_styles_category ON styles(category);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_styles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_styles_updated_at
  BEFORE UPDATE ON styles
  FOR EACH ROW
  EXECUTE FUNCTION update_styles_updated_at();

-- Enable RLS (security handled at API level)
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive - security at API level)
CREATE POLICY "Allow all operations" ON styles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert some default public styles for interior design
INSERT INTO styles (user_id, name, description, prompt_suffix, category, is_public) VALUES
  (NULL, 'Photorealistic', 'Ultra-realistic interior photography', 'photorealistic, 8k, professional photography, natural lighting, sharp focus', 'photography', true),
  (NULL, 'Modern Minimalist', 'Clean, minimal contemporary design', 'modern minimalist interior, clean lines, neutral colors, spacious, contemporary design', 'style', true),
  (NULL, 'Scandinavian', 'Cozy Nordic design aesthetic', 'Scandinavian interior design, cozy, light wood, white walls, hygge, natural materials', 'style', true),
  (NULL, 'Industrial', 'Urban industrial loft style', 'industrial interior design, exposed brick, metal fixtures, concrete floors, urban loft', 'style', true),
  (NULL, 'Bohemian', 'Eclectic boho-chic style', 'bohemian interior, eclectic, colorful textiles, plants, vintage furniture, artistic', 'style', true),
  (NULL, 'Luxury', 'High-end luxury design', 'luxury interior design, premium materials, elegant, sophisticated, high-end furniture, opulent', 'style', true),
  (NULL, 'Rustic', 'Country rustic charm', 'rustic interior, country style, reclaimed wood, stone, cozy fireplace, natural textures', 'style', true),
  (NULL, 'Art Deco', '1920s glamour', 'Art Deco interior, geometric patterns, luxurious materials, gold accents, vintage glamour', 'style', true),
  (NULL, 'Japanese', 'Zen minimalist Japanese design', 'Japanese interior design, zen, tatami, shoji screens, minimal, natural materials', 'style', true),
  (NULL, 'Mediterranean', 'Sunny Mediterranean style', 'Mediterranean interior, white walls, blue accents, terracotta, stone, coastal, bright', 'style', true)
ON CONFLICT DO NOTHING;

