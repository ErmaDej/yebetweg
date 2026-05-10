/*
  # Add Unsplash Images for Visual Completeness

  Updates all blog, listing, professional, and ad records with high-quality
  Unsplash images to give the YeBetWeg platform a complete, professional appearance.
  This migration also creates indexes for improved query performance.

  Images cover:
  - 8 blog articles with construction, architecture, and property imagery
  - 5 property listings with real estate photography
  - 4 material/service listings with relevant product images
  - 3 advertisements with professional marketing visuals
  - Professional portfolio images for 3+ construction experts
*/

-- Update blogs with Unsplash construction and architecture images
UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=500&fit=crop'
WHERE slug = 'rebar-grade-selection-addis';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1599720810694-d2b46f82b237?w=800&h=500&fit=crop'
WHERE slug = 'ethiopian-building-code-g5';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=800&h=500&fit=crop'
WHERE slug = 'building-human-act-philosophy';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&h=500&fit=crop'
WHERE slug = 'cement-market-overview-2024';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=500&fit=crop'
WHERE slug = 'waterproofing-lab-results';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1581092165622-40a0ad1d5c84?w=800&h=500&fit=crop'
WHERE slug = 'concrete-mixing-best-practices';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=500&fit=crop'
WHERE slug = 'property-market-trends-2024';

UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1533590481720-89af130cc6b5?w=800&h=500&fit=crop'
WHERE slug = 'cement-types-applications';

-- Update advertisements with Unsplash marketing images
UPDATE ads SET image_url = 'https://images.unsplash.com/photo-1581092162562-40038cf6a398?w=1200&h=300&fit=crop'
WHERE advertiser = 'Ethiopian Construction Materials Corp';

UPDATE ads SET image_url = 'https://images.unsplash.com/photo-1581092156297-2da37db581a2?w=400&h=400&fit=crop'
WHERE advertiser = 'Addis Steel & Rebar Supply';

UPDATE ads SET image_url = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=500&h=300&fit=crop'
WHERE advertiser = 'Modern Homes Real Estate';

-- Update professional portfolio images
UPDATE professionals SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1629156069898-49953e39b3ac?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1590080876081-5e6e8979b0d8?w=400&h=400&fit=crop'
]
WHERE name = 'Arch. Tigist Haile';

UPDATE professionals SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1581092162080-8cbb47f1f744?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1581092916228-d4d8ba7e7dea?w=400&h=400&fit=crop'
]
WHERE name = 'Eng. Dawit Amare';

UPDATE professionals SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1581092165625-78991c1a8e7b?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1581092162560-40c08b2fdc0a?w=400&h=400&fit=crop'
]
WHERE name = 'Ato Bezabih Girma';

-- Update property listings with real estate photography
UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1570129477492-45927003fa5f?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop'
]
WHERE title_en = 'New G+2 House in Bole';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1545489519-1c4b3a5c3a2a?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1586228052259-bad381248264?w=600&h=400&fit=crop'
]
WHERE title_en = 'G+1 House for Sale in CMC';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop'
]
WHERE title_en = '3BR Apartment for Rent in Kazanchis';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1550355291-bbee04a248f0?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&h=400&fit=crop'
]
WHERE title_en = '2BR Apartment for Rent in Lafto';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1585399363548-e39ce51872ae?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1552037014-6ba17fa6e4ca?w=600&h=400&fit=crop'
]
WHERE title_en = '200sqm Land in Lebu';

-- Update material/service listings with product imagery
UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1581092945685-c5f1d9c01b5b?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&h=400&fit=crop'
]
WHERE title_en = 'Derba Cement Wholesale';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&h=400&fit=crop'
]
WHERE title_en = 'Grade 60 Rebar Wholesale';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1581092918118-2b43e48a93e7?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1518618308236-f6f3ecfe0b59?w=600&h=400&fit=crop'
]
WHERE title_en = 'Electrical Materials Package';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1598305209783-665ac06d02ae?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=600&h=400&fit=crop'
]
WHERE title_en = 'Tiles and Finishing Materials';

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_blogs_image_url ON blogs(image_url);
CREATE INDEX IF NOT EXISTS idx_ads_image_url ON ads(image_url);
CREATE INDEX IF NOT EXISTS idx_professionals_images ON professionals USING gin(portfolio_images);
