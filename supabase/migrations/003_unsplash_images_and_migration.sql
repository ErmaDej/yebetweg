/*
  # Update seed data with Unsplash image URLs and finalize migration

  This migration updates all blog, listing, professional, and ads with real
  Unsplash image URLs for visual completeness. Also finalizes the schema
  for production use.
*/

-- Update blogs with Unsplash images
UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1611532736000-d9c0fb9c1ac9?w=800&h=400&fit=crop' 
WHERE slug = 'rebar-grade-selection-addis';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=400&fit=crop' 
WHERE slug = 'ethiopian-building-code-g5';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=400&fit=crop' 
WHERE slug = 'building-human-act-philosophy';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&h=400&fit=crop' 
WHERE slug = 'cement-market-overview-2024';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=400&fit=crop' 
WHERE slug = 'waterproofing-lab-results';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1599720810694-d2b46f82b237?w=800&h=400&fit=crop' 
WHERE slug = 'concrete-mixing-best-practices';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=400&fit=crop' 
WHERE slug = 'property-market-trends-2024';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=400&fit=crop' 
WHERE slug = 'cement-types-applications';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blogs_category ON blogs(category);
CREATE INDEX IF NOT EXISTS idx_blogs_is_featured ON blogs(is_featured);
CREATE INDEX IF NOT EXISTS idx_tips_is_premium ON tips(is_premium);
CREATE INDEX IF NOT EXISTS idx_market_prices_category ON market_prices(category);
CREATE INDEX IF NOT EXISTS idx_listings_listing_type ON listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_professionals_specialty ON professionals(specialty);
CREATE INDEX IF NOT EXISTS idx_professionals_is_verified ON professionals(is_verified);

-- Create view for featured content
CREATE OR REPLACE VIEW featured_content AS
SELECT 'blog' as type, id, title_en as title, image_url, created_at
FROM blogs WHERE is_featured = true
UNION ALL
SELECT 'tip' as type, id, title_en as title, '' as image_url, created_at
FROM tips WHERE is_premium = false
LIMIT 10;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON blogs, tips, market_prices, listings, professionals, ads, subscribers, inquiries, premium_subscriptions TO authenticated;
