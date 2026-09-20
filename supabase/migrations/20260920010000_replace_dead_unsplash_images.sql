-- ============================================================================
-- Replace dead Unsplash image URLs with local branded assets (2026-09-20)
-- ============================================================================
-- Live probe (2026-09-20) found 33 of the seeded images.unsplash.com URLs now
-- return 404 (Unsplash removed the photos). The frontend falls back to a
-- generic placeholder; this migration swaps the dead URLs for themed local
-- SVGs (public/images/*.svg) so cards show intentional branded art instead.
-- Alive URLs are left untouched. Idempotent: re-running is a no-op.
--
-- Array columns are remapped in one pass (order-preserving CASE over unnest),
-- so rows with several dead members are fully repaired in a single statement.
-- ============================================================================

-- Scalar columns: blogs + ads -------------------------------------------------
UPDATE blogs SET image_url = '/images/blog-construction.svg'
WHERE image_url LIKE '%photo-1533590481720-89af130cc6b5%'
   OR image_url LIKE '%photo-1581092160562-40a0ad1d5c84%'
   OR image_url LIKE '%photo-1581092165622-40a0ad1d5c84%'
   OR image_url LIKE '%photo-1599720810694-d2b46f82b237%'
   OR image_url LIKE '%photo-1518618308236-f6f3ecfe0b59%'
   OR image_url LIKE '%photo-1581092162560-40c08b2fdc0a%'
   OR image_url LIKE '%photo-1552037014-6ba17fa6e4ca%'
   OR image_url LIKE '%photo-1581092916228-d4d8ba7e7dea%'
   OR image_url LIKE '%photo-1586228052259-bad381248264%'
   OR image_url LIKE '%photo-1590080876081-5e6e8979b0d8%';

UPDATE ads SET image_url = '/images/ad-banner.svg'
WHERE image_url LIKE '%photo-1581092162562-40038cf6a398%'
   OR image_url LIKE '%photo-1581092156297-2da37db581a2%'
   OR image_url LIKE '%photo-1581092162560-40c08b2fdc0a%'
   OR image_url LIKE '%photo-1552037014-6ba17fa6e4ca%'
   OR image_url LIKE '%photo-1581092916228-d4d8ba7e7dea%';

-- listings.images (text[]) ----------------------------------------------------
UPDATE listings
SET images = (
  SELECT coalesce(array_agg(
    CASE
      WHEN x LIKE '%photo-1503387762-5928d0c3e5db%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1600607687644-c7178a9b7e0c%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1519003722824-194d44558860%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1581092160562-3a5c7b9d6c0a%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1581092921461-eab62e21a7a5%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1581093458791-9d42e3c2b898%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1611284446315-62a6488c8a8c%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1621905252507-0aa9247e9363%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1522708323593-d3c6e5c0e5f0%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1605276374104-dee2a0403b30%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1545489519-1c4b3a5c3a2a%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1550355291-bbee04a248f0%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1570129477492-45927003fa5f%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1581092918118-2b43e48a93e7%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1585399363548-e39ce51872ae%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1581092945685-c5f1d9c01b5b%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1598305209783-665ac06d02ae%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1518618308236-f6f3ecfe0b59%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1581092162560-40c08b2fdc0a%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1552037014-6ba17fa6e4ca%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1581092916228-d4d8ba7e7dea%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1586228052259-bad381248264%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1590080876081-5e6e8979b0d8%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1629156069898-49953e39b3ac%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1581092162080-8cbb47f1f744%' THEN '/images/listing-default.svg'
      WHEN x LIKE '%photo-1611532736000-d9c0fb9c1ac9%' THEN '/images/listing-default.svg'
      ELSE x
    END
    ORDER BY ord
  ), '{}')
  FROM unnest(images) WITH ORDINALITY AS t(x, ord)
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(images) AS x
  WHERE x LIKE 'https://images.unsplash.com/photo-1503387762-5928d0c3e5db%'
     OR x LIKE 'https://images.unsplash.com/photo-1600607687644-c7178a9b7e0c%'
     OR x LIKE 'https://images.unsplash.com/photo-1519003722824-194d44558860%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092160562-3a5c7b9d6c0a%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092921461-eab62e21a7a5%'
     OR x LIKE 'https://images.unsplash.com/photo-1581093458791-9d42e3c2b898%'
     OR x LIKE 'https://images.unsplash.com/photo-1611284446315-62a6488c8a8c%'
     OR x LIKE 'https://images.unsplash.com/photo-1621905252507-0aa9247e9363%'
     OR x LIKE 'https://images.unsplash.com/photo-1522708323593-d3c6e5c0e5f0%'
     OR x LIKE 'https://images.unsplash.com/photo-1605276374104-dee2a0403b30%'
     OR x LIKE 'https://images.unsplash.com/photo-1545489519-1c4b3a5c3a2a%'
     OR x LIKE 'https://images.unsplash.com/photo-1550355291-bbee04a248f0%'
     OR x LIKE 'https://images.unsplash.com/photo-1570129477492-45927003fa5f%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092918118-2b43e48a93e7%'
     OR x LIKE 'https://images.unsplash.com/photo-1585399363548-e39ce51872ae%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092945685-c5f1d9c01b5b%'
     OR x LIKE 'https://images.unsplash.com/photo-1598305209783-665ac06d02ae%'
     OR x LIKE 'https://images.unsplash.com/photo-1518618308236-f6f3ecfe0b59%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092162560-40c08b2fdc0a%'
     OR x LIKE 'https://images.unsplash.com/photo-1552037014-6ba17fa6e4ca%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092916228-d4d8ba7e7dea%'
     OR x LIKE 'https://images.unsplash.com/photo-1586228052259-bad381248264%'
     OR x LIKE 'https://images.unsplash.com/photo-1590080876081-5e6e8979b0d8%'
     OR x LIKE 'https://images.unsplash.com/photo-1629156069898-49953e39b3ac%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092162080-8cbb47f1f744%'
     OR x LIKE 'https://images.unsplash.com/photo-1611532736000-d9c0fb9c1ac9%'
);

-- professionals.portfolio_images (text[]) -------------------------------------
UPDATE professionals
SET portfolio_images = (
  SELECT coalesce(array_agg(
    CASE
      WHEN x LIKE '%photo-1503387762-5928d0c3e5db%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1600607687644-c7178a9b7e0c%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1581092165625-78991c1a8e7b%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1585399363548-e39ce51872ae%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1581093458791-9d42e3c2b898%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1611284446315-62a6488c8a8c%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1581092160562-3a5c7b9d6c0a%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1581092921461-eab62e21a7a5%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1621905252507-0aa9247e9363%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1518618308236-f6f3ecfe0b59%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1581092162560-40c08b2fdc0a%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1552037014-6ba17fa6e4ca%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1581092916228-d4d8ba7e7dea%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1586228052259-bad381248264%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1590080876081-5e6e8979b0d8%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1629156069898-49953e39b3ac%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1581092162080-8cbb47f1f744%' THEN '/images/professional-portfolio.svg'
      WHEN x LIKE '%photo-1611532736000-d9c0fb9c1ac9%' THEN '/images/professional-portfolio.svg'
      ELSE x
    END
    ORDER BY ord
  ), '{}')
  FROM unnest(portfolio_images) WITH ORDINALITY AS t(x, ord)
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(portfolio_images) AS x
  WHERE x LIKE 'https://images.unsplash.com/photo-1503387762-5928d0c3e5db%'
     OR x LIKE 'https://images.unsplash.com/photo-1600607687644-c7178a9b7e0c%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092165625-78991c1a8e7b%'
     OR x LIKE 'https://images.unsplash.com/photo-1585399363548-e39ce51872ae%'
     OR x LIKE 'https://images.unsplash.com/photo-1581093458791-9d42e3c2b898%'
     OR x LIKE 'https://images.unsplash.com/photo-1611284446315-62a6488c8a8c%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092160562-3a5c7b9d6c0a%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092921461-eab62e21a7a5%'
     OR x LIKE 'https://images.unsplash.com/photo-1621905252507-0aa9247e9363%'
     OR x LIKE 'https://images.unsplash.com/photo-1518618308236-f6f3ecfe0b59%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092162560-40c08b2fdc0a%'
     OR x LIKE 'https://images.unsplash.com/photo-1552037014-6ba17fa6e4ca%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092916228-d4d8ba7e7dea%'
     OR x LIKE 'https://images.unsplash.com/photo-1586228052259-bad381248264%'
     OR x LIKE 'https://images.unsplash.com/photo-1590080876081-5e6e8979b0d8%'
     OR x LIKE 'https://images.unsplash.com/photo-1629156069898-49953e39b3ac%'
     OR x LIKE 'https://images.unsplash.com/photo-1581092162080-8cbb47f1f744%'
     OR x LIKE 'https://images.unsplash.com/photo-1611532736000-d9c0fb9c1ac9%'
);
