/*
  # Update listings and professionals with Unsplash images

  1. Updated Tables
    - `listings` — Replace placeholder image paths with real Unsplash URLs for all 12 listings
    - `professionals` — Add portfolio images for all 6 professionals
*/

-- Update property listings with real estate images
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop'] WHERE title_en = 'New G+2 House in Bole';
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1605276374104-dee2a0403b30?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=600&h=400&fit=crop'] WHERE title_en = 'G+1 House for Sale in CMC';
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1522708323593-d3c6e5c0e5f0?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop'] WHERE title_en = '3BR Apartment for Rent in Kazanchis';
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600&h=400&fit=crop'] WHERE title_en = '2BR Apartment for Rent in Lafto';
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop'] WHERE title_en = '200sqm Land in Lebu';

-- Update material listings with product images
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1581093458791-9d42e3c2b898?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1611284446315-62a6488c8a8c?w=600&h=400&fit=crop'] WHERE title_en = 'Derba Cement Wholesale';
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1519003722824-194d44558860?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1581092160562-3a5c7b9d6c0a?w=600&h=400&fit=crop'] WHERE title_en = 'Grade 60 Rebar Wholesale';
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop'] WHERE title_en = 'Electrical Materials Package';
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop'] WHERE title_en = 'Tiles and Finishing Materials';

-- Update service listings with professional imagery
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1503387762-5928d0c3e5db?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1600607687644-c7178a9b7e0c?w=600&h=400&fit=crop'] WHERE title_en = 'Architectural Design Services';
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1581092160562-3a5c7b9d6c0a?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1581092921461-eab62e21a7a5?w=600&h=400&fit=crop'] WHERE title_en = 'Structural Engineering Consultation';
UPDATE listings SET images = ARRAY['https://images.unsplash.com/photo-1621905252507-0aa9247e9363?w=600&h=400&fit=crop', 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=400&fit=crop'] WHERE title_en = 'Plumbing & Electrical Contracting';

-- Update professionals with portfolio images
UPDATE professionals SET portfolio_images = ARRAY['https://images.unsplash.com/photo-1503387762-5928d0c3e5db?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1600607687644-c7178a9b7e0c?w=400&h=400&fit=crop'] WHERE name = 'Eng. Dawit Amare';
UPDATE professionals SET portfolio_images = ARRAY['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400&h=400&fit=crop'] WHERE name = 'Arch. Tigist Haile';
UPDATE professionals SET portfolio_images = ARRAY['https://images.unsplash.com/photo-1581092160562-3a5c7b9d6c0a?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1581092921461-eab62e21a7a5?w=400&h=400&fit=crop'] WHERE name = 'Ato Bezabih Girma';
UPDATE professionals SET portfolio_images = ARRAY['https://images.unsplash.com/photo-1621905252507-0aa9247e9363?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=400&fit=crop'] WHERE name = 'W/rt Hiwot Tadesse';
UPDATE professionals SET portfolio_images = ARRAY['https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop'] WHERE name = 'Ato Samuel Assefa';
UPDATE professionals SET portfolio_images = ARRAY['https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1581093458791-9d42e3c2b898?w=400&h=400&fit=crop'] WHERE name = 'Ato Fikadu Bekele';