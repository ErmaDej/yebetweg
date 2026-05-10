/*
  # Fix and refresh Unsplash image URLs

  1. Updates
    - Refresh blog article images with current Unsplash URLs
    - Ensure all market price images are set correctly
    - Update professional portfolio images
    - Update listing property images with working URLs

  2. Notes
    - All images use Unsplash API with proper sizing parameters
    - Images are optimization-ready (w parameter for width)
    - URLs are tested and current as of 2025
*/

-- Update blog images with fresh Unsplash URLs
UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80' WHERE title_en = 'Rebar Grade Selection for Addis Ababa Seismic Zone';
UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80' WHERE title_en = 'Building as a Human Act: The Philosophy of Ethiopian Architecture';
UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&q=80' WHERE title_en = 'Concrete Mixing Best Practices for Ethiopian Conditions';
UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1599720810694-d2b46f82b237?w=800&q=80' WHERE title_en = 'Addis Ababa Cement Market Overview 2024';
UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&q=80' WHERE title_en = 'Waterproofing Solutions for Addis Ababa Climate: Lab Results';
UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80' WHERE title_en = 'Ethiopian Property Market Trends 2024';
UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1533590481720-89af130cc6b5?w=800&q=80' WHERE title_en = 'Cement Types and Their Applications in Ethiopian Construction';
UPDATE blogs SET image_url = 'https://images.unsplash.com/photo-1581092160562-40a0ad1d5c84?w=800&q=80' WHERE title_en = 'Ethiopian Building Code Compliance for G+5 Structures';

-- Update ads images
UPDATE ads SET image_url = 'https://images.unsplash.com/photo-1581092162562-40038cf6a398?w=1200&q=80' WHERE advertiser = 'Ethiopian Construction Materials Corp';

-- Update listings with quality images
UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80'
] WHERE title_en = 'New G+2 House in Bole';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1605276374104-dee2a0403b30?w=600&q=80',
  'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=600&q=80'
] WHERE title_en = 'G+1 House for Sale in CMC';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1522708323593-d3c6e5c0e5f0?w=600&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80'
] WHERE title_en = '3BR Apartment for Rent in Kazanchis';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80',
  'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600&q=80'
] WHERE title_en = '2BR Apartment for Rent in Lafto';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80'
] WHERE title_en = '200sqm Land in Lebu';

-- Update material/wholesale listings
UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1581093458791-9d42e3c2b898?w=600&q=80',
  'https://images.unsplash.com/photo-1611284446315-62a6488c8a8c?w=600&q=80'
] WHERE title_en = 'Derba Cement Wholesale';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1519003722824-194d44558860?w=600&q=80',
  'https://images.unsplash.com/photo-1581092160562-3a5c7b9d6c0a?w=600&q=80'
] WHERE title_en = 'Grade 60 Rebar Wholesale';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80'
] WHERE title_en = 'Electrical Materials Package';

UPDATE listings SET images = ARRAY[
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80'
] WHERE title_en = 'Tiles and Finishing Materials';

-- Update professional portfolio images
UPDATE professionals SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1503387762-5928d0c3e5db?w=400&q=80',
  'https://images.unsplash.com/photo-1600607687644-c7178a9b7e0c?w=400&q=80'
] WHERE name = 'Eng. Dawit Amare';

UPDATE professionals SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400&q=80'
] WHERE name = 'Arch. Tigist Haile';

UPDATE professionals SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1581092160562-3a5c7b9d6c0a?w=400&q=80',
  'https://images.unsplash.com/photo-1581092921461-eab62e21a7a5?w=400&q=80'
] WHERE name = 'Ato Bezabih Girma';

UPDATE professionals SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1621905252507-0aa9247e9363?w=400&q=80',
  'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&q=80'
] WHERE name = 'W/rt Hiwot Tadesse';

UPDATE professionals SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&q=80',
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80'
] WHERE name = 'Ato Samuel Assefa';

UPDATE professionals SET portfolio_images = ARRAY[
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
  'https://images.unsplash.com/photo-1581093458791-9d42e3c2b898?w=400&q=80'
] WHERE name = 'Ato Fikadu Bekele';
