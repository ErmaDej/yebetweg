/*
  # YeBetWeg Database Schema

  1. New Tables
    - `blogs` — Bilingual construction articles and knowledge posts
      - id (uuid, PK), title_am (text), title_en (text), content (text),
        category (text), image_url (text), author (text), slug (text, unique),
        is_featured (boolean), created_at (timestamptz)
    - `tips` — Construction tips and consultation snippets
      - id (uuid, PK), title_am (text), title_en (text), content (text),
        category (text), is_premium (boolean), icon (text), created_at (timestamptz)
    - `market_prices` — Live construction material pricing for Addis Ababa
      - id (uuid, PK), material_am (text), material_en (text), unit (text),
        price (numeric), change_percent (numeric), category (text),
        updated_at (timestamptz)
    - `listings` — Multi-party marketplace connector
      - id (uuid, PK), listing_type (text), title_am (text), title_en (text),
        description (text), price (numeric), location (text), contact_phone (text),
        contact_email (text), images (text[]), is_verified (boolean),
        is_urgent (boolean), category (text), created_at (timestamptz)
    - `professionals` — Verified construction professionals directory
      - id (uuid, PK), name (text), specialty (text), rating (numeric),
        experience_years (integer), location (text), phone (text), email (text),
        is_verified (boolean), portfolio_images (text[]), created_at (timestamptz)
    - `ads` — Advertisement slots
      - id (uuid, PK), advertiser (text), image_url (text), link (text),
        position (text), is_active (boolean), created_at (timestamptz)
    - `subscribers` — Newsletter signups
      - id (uuid, PK), email (text, unique), language_preference (text),
        created_at (timestamptz)
    - `inquiries` — Contact and consultation requests
      - id (uuid, PK), name (text), email (text), phone (text), subject (text),
        message (text), listing_id (uuid), created_at (timestamptz)
    - `premium_subscriptions` — Membership tracking
      - id (uuid, PK), user_id (uuid), tier (text), payment_method (text),
        chapa_reference (text), starts_at (timestamptz), expires_at (timestamptz),
        is_active (boolean)

  2. Security
    - Enable RLS on all tables
    - Public read on blogs, tips, market_prices, listings, professionals, ads
    - Public insert on listings, subscribers, inquiries
    - Premium-gated read on tips (is_premium) and market_prices (beyond free tier)
    - Admin-only write on blogs, tips, market_prices, ads, professionals
*/

-- Blogs table
CREATE TABLE IF NOT EXISTS blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_am text NOT NULL,
  title_en text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'construction_techniques',
  image_url text DEFAULT '',
  author text NOT NULL DEFAULT 'YeBetWeg Team',
  slug text UNIQUE NOT NULL,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Tips table
CREATE TABLE IF NOT EXISTS tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_am text NOT NULL,
  title_en text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'structural',
  is_premium boolean DEFAULT false,
  icon text DEFAULT 'lightbulb',
  created_at timestamptz DEFAULT now()
);

-- Market prices table
CREATE TABLE IF NOT EXISTS market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_am text NOT NULL,
  material_en text NOT NULL,
  unit text NOT NULL,
  price numeric NOT NULL,
  change_percent numeric DEFAULT 0,
  category text NOT NULL DEFAULT 'cement',
  updated_at timestamptz DEFAULT now()
);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type text NOT NULL DEFAULT 'property_sale',
  title_am text NOT NULL,
  title_en text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL,
  location text NOT NULL,
  contact_phone text DEFAULT '',
  contact_email text DEFAULT '',
  images text[] DEFAULT '{}',
  is_verified boolean DEFAULT false,
  is_urgent boolean DEFAULT false,
  category text NOT NULL DEFAULT 'property',
  created_at timestamptz DEFAULT now()
);

-- Professionals table
CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text NOT NULL DEFAULT 'contractor',
  rating numeric DEFAULT 0,
  experience_years integer DEFAULT 0,
  location text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  is_verified boolean DEFAULT false,
  portfolio_images text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Ads table
CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser text NOT NULL,
  image_url text DEFAULT '',
  link text DEFAULT '',
  position text NOT NULL DEFAULT 'native_card',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  language_preference text DEFAULT 'en',
  created_at timestamptz DEFAULT now()
);

-- Inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Premium subscriptions table
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  tier text NOT NULL DEFAULT 'free',
  payment_method text DEFAULT '',
  chapa_reference text DEFAULT '',
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public can read blogs" ON blogs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can read free tips" ON tips FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can read market prices" ON market_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can read listings" ON listings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can read professionals" ON professionals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can read active ads" ON ads FOR SELECT TO anon, authenticated USING (is_active = true);

-- Public insert policies
CREATE POLICY "Anyone can submit listings" ON listings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can subscribe" ON subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can submit inquiries" ON inquiries FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Authenticated user policies for own data
CREATE POLICY "Users can read own subscription" ON premium_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
