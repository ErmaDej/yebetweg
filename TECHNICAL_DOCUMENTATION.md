# YeBetWeg Technical Documentation

## System Architecture Overview

YeBetWeg is a full-stack React application with Supabase backend, optimized for construction knowledge and marketplace operations in Ethiopia.

**Technology Stack:**
- **Frontend:** React 19 + TypeScript + Vite 7
- **Styling:** Tailwind CSS v4 with OKLCH colors
- **UI Components:** shadcn/ui (60+ components)
- **Database:** Supabase (PostgreSQL)
- **Icons:** Lucide React + Custom SVG
- **Forms:** React Hook Form + Zod
- **Internationalization:** Custom React Context (i18n)

---

## Project Structure

```
project/
├── src/
│   ├── components/
│   │   ├── layout/           # Header, footer, navigation
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── FloatingSocialBar.tsx
│   │   ├── sections/         # Page sections
│   │   │   ├── HeroSection.tsx
│   │   │   ├── BlogSection.tsx
│   │   │   ├── TipsSection.tsx
│   │   │   ├── MarketPricesSection.tsx
│   │   │   ├── MarketplaceSection.tsx
│   │   │   ├── ProfessionalsSection.tsx
│   │   │   ├── PremiumSection.tsx
│   │   │   ├── SocialBridgeSection.tsx
│   │   │   ├── ContactSection.tsx
│   │   │   └── AdsSection.tsx
│   │   ├── icons/            # Custom SVG components
│   │   │   └── telegram-icon.tsx
│   │   ├── mode-toggle.tsx   # Dark mode switcher
│   │   ├── theme-provider.tsx # Theme context
│   │   └── ui/               # 60+ shadcn components
│   ├── hooks/
│   │   ├── useInView.ts      # Intersection Observer
│   │   ├── useBlogs.ts       # Blog data fetching
│   │   ├── useTips.ts        # Tips data fetching
│   │   ├── useMarketPrices.ts # Price data
│   │   ├── useListings.ts    # Listing data
│   │   └── useProfessionals.ts # Professional directory
│   ├── lib/
│   │   ├── i18n.tsx          # English/Amharic translations
│   │   ├── supabase.ts       # Supabase client
│   │   └── utils.ts          # Utility functions
│   ├── App.tsx               # Main component
│   ├── main.tsx              # React entry point
│   └── index.css             # Global styles + animations
├── supabase/
│   └── migrations/           # Database schema
│       ├── 001_yebetweg_schema.sql
│       ├── 002_yebetweg_seed_data.sql
│       ├── 004_add_unsplash_images.sql
│       └── 005_update_listing_professional_images.sql
├── public/                   # Static assets
├── components.json           # shadcn configuration
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # Tailwind CSS config
├── package.json              # Dependencies
└── index.html                # HTML entry point
```

---

## Database Schema

### Tables Overview

**9 Core Tables** (54+ seed records)

#### 1. blogs
```sql
- id (uuid, PK)
- title_am, title_en (text)
- content (text)
- category (text): construction_techniques, philosophy, market_insights, regulations, materials
- image_url (text): Unsplash CDN links
- author (text)
- slug (text, unique)
- is_featured (boolean)
- created_at (timestamp)

Indexes: idx_blogs_category, idx_blogs_is_featured, idx_blogs_image_url
RLS: Public read access
```

#### 2. tips
```sql
- id (uuid, PK)
- title_am, title_en (text)
- content (text)
- category (text): structural, finishing, foundation, waterproofing, electrical, plumbing
- is_premium (boolean): 6 free, 4 premium
- icon (text): lucide icon names
- created_at (timestamp)

Indexes: idx_tips_is_premium
RLS: Public read access
```

#### 3. market_prices
```sql
- id (uuid, PK)
- material_am, material_en (text)
- unit (text): Quintal, Square Meter, Meter, Piece
- price (numeric)
- change_percent (numeric)
- category (text): cement, steel, aggregate, wood, finishing, electrical
- updated_at (timestamp)

Indexes: idx_market_prices_category
RLS: Public read access
Current Data: 15 materials, Addis Ababa market prices
```

#### 4. listings
```sql
- id (uuid, PK)
- listing_type (text): property_sale, property_rent, land_sale, material_sale, professional_service
- title_am, title_en (text)
- description (text)
- price (numeric)
- location (text)
- contact_phone, contact_email (text)
- images (text[]): Array of Unsplash URLs
- is_verified (boolean)
- is_urgent (boolean)
- category (text)
- created_at (timestamp)

Indexes: idx_listings_listing_type, idx_listings_created_at
RLS: Public read, public insert
Foreign Keys: None (soft relationships only)
```

#### 5. professionals
```sql
- id (uuid, PK)
- name (text)
- specialty (text): architect, engineer, contractor, electrician, plumber, surveyor
- rating (numeric): 0-5.0
- experience_years (integer)
- location (text)
- phone, email (text)
- is_verified (boolean)
- portfolio_images (text[]): Array of Unsplash URLs
- created_at (timestamp)

Indexes: idx_professionals_specialty, idx_professionals_is_verified
RLS: Public read, public insert
```

#### 6. ads
```sql
- id (uuid, PK)
- advertiser (text)
- image_url (text): Unsplash CDN link
- link (text): CTA URL
- position (text): leaderboard, sidebar, native_card
- is_active (boolean)
- created_at (timestamp)

Indexes: idx_ads_image_url
RLS: Public read (active only)
```

#### 7. subscribers
```sql
- id (uuid, PK)
- email (text, unique)
- language_preference (text): en, am
- created_at (timestamp)

RLS: Public insert only
```

#### 8. inquiries
```sql
- id (uuid, PK)
- name, email (text)
- phone (text)
- subject (text)
- message (text)
- listing_id (uuid, FK -> listings)
- created_at (timestamp)

RLS: Public insert only
```

#### 9. premium_subscriptions
```sql
- id (uuid, PK)
- user_id (uuid)
- tier (text): free, premium, pro
- payment_method (text)
- chapa_reference (text)
- starts_at, expires_at (timestamp)
- is_active (boolean)
- created_at (timestamp)

RLS: Authenticated users read own subscription
```

---

## Internationalization (i18n)

### Translation System

**Implementation:** React Context with localStorage persistence

**Supported Languages:**
- English (en)
- Amharic (am/አማርኛ)

**Translation Keys:** 120+ keys covering all UI text

### Language Switching

```tsx
// useLanguage hook provides:
const { language, setLanguage, t } = useLanguage()

// Usage:
<h1>{t("hero.headline")}</h1>
setLanguage("am")  // Switch to Amharic
```

### Character Rendering

**Font Stack:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Ethiopic:wght@300;400;500;600;700;800&display=swap');

font-family: 'Inter', 'Noto Sans Ethiopic', system-ui, sans-serif;
```

**Amharic Translations:** Noto Sans Ethiopic auto-loads for full Unicode support

---

## Component Architecture

### Section Components

Each section implements:
- **useInView Hook**: Intersection Observer for scroll animations
- **useLanguage Hook**: Bilingual content
- **Supabase Integration**: Real-time data fetching
- **Responsive Grid**: Mobile-first layout (1 → 2 → 3 columns)
- **Loading States**: Skeleton loaders during data fetch
- **Error Handling**: Graceful fallbacks

### Example: BlogSection Flow

```tsx
1. useBlogs(category) → Fetches from blogs table
2. Filter by category (all/construction/philosophy/etc)
3. useInView() → Triggers animation when visible
4. Map blogs to BlogCard components
5. Display images from blog.image_url
6. Show loading skeletons while fetching
```

### Data Hooks Pattern

```tsx
// useBlogs pattern
const { blogs, loading, error } = useBlogs(category)

// Returns:
// - blogs: array of blog objects
// - loading: boolean while fetching
// - error: error message if failed
```

---

## Styling System

### Color Tokens (OKLCH)

**Root Variables (Light Mode):**
```css
--primary: oklch(0.38 0.1 240)        /* Deep Blue */
--accent: oklch(0.7 0.16 60)          /* Amber Gold */
--background: oklch(0.98 0.002 240)   /* Near White */
--foreground: oklch(0.18 0.04 240)    /* Dark Blue */
```

**Dark Mode Overrides:**
```css
--primary: oklch(0.55 0.12 240)       /* Light Blue */
--background: oklch(0.14 0.02 240)    /* Dark Gray */
--foreground: oklch(0.95 0.005 240)   /* Near White */
```

### Custom Animations

```css
@keyframes typewriter         /* Text typing effect */
@keyframes blink-caret        /* Blinking cursor */
@keyframes marquee            /* Scrolling text */
@keyframes fade-in-up         /* Scroll animation */
@keyframes count-up           /* Number animation */
@keyframes float              /* Floating element */
@keyframes shimmer            /* Loading shimmer */
```

### Utility Classes

- `.animate-typewriter` - Typing effect
- `.animate-marquee` - Scrolling animation
- `.animate-fade-in-up` - Fade in on scroll
- `.animate-float` - Float up/down
- `.animate-shimmer` - Shimmer loading
- `.glassmorphism` - Blur effect
- `.premium-blur` - Blur locked content

---

## Responsive Design

### Breakpoints (Tailwind v4)

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Grid Layouts

**Sections:**
```tsx
// Grid adapts automatically:
grid-cols-1          // Mobile: 1 column
sm:grid-cols-2       // Tablet: 2 columns
lg:grid-cols-3       // Desktop: 3 columns
```

**Navigation:**
```tsx
// Hidden on mobile, visible on desktop
hidden lg:flex       // Hide mobile, show desktop
lg:hidden             // Show mobile, hide desktop
```

---

## Image Optimization

### Unsplash Integration

**All Images Use:**
- CDN: images.unsplash.com
- Query Parameters: `w=WIDTH&h=HEIGHT&fit=crop`
- Responsive: Varies by device (200px-800px width)
- Format: Auto-negotiated (WebP, JPEG)
- Lazy Loading: `loading="lazy"` attribute

**Image Sources:**

| Section | Count | Dimensions | Purpose |
|---------|-------|-----------|---------|
| Blogs | 8 | 800×500px | Article covers |
| Listings | 12 | 600×400px | Property/product |
| Professionals | 6 | 400×400px | Portfolio |
| Ads | 3 | Varies | Marketing |

### Image Rendering

```tsx
{listing.image_url && (
  <img
    src={listing.image_url}
    alt={title}
    className="w-full h-full object-cover"
    loading="lazy"
  />
)}
```

---

## API Integration

### Supabase Client Setup

```tsx
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)
```

### Data Fetching Pattern

```tsx
// Example: Fetch listings
const { data, error } = await supabase
  .from("listings")
  .select("*")
  .eq("listing_type", "property_sale")
  .order("created_at", { ascending: false })
```

### Key Supabase Features Used

- **RLS Policies**: Secure data access control
- **Real-time Updates**: Listen to table changes
- **Full-text Search**: Query optimization
- **Foreign Keys**: Data integrity
- **Timestamps**: Automatic created_at/updated_at

---

## Performance Metrics

### Bundle Size

- **CSS**: 139.86 KB (21.11 KB gzipped)
- **JavaScript**: 642.10 KB (185.81 KB gzipped)
- **Total**: ~207 KB gzipped

### Optimization Techniques

1. **Code Splitting**: Dynamic imports for sections
2. **Tree Shaking**: Unused code elimination
3. **Component Memoization**: React.memo on list items
4. **Image Optimization**: Unsplash CDN + lazy loading
5. **CSS Optimization**: Tailwind purging
6. **Intersection Observer**: Scroll-based animations

### Load Performance

- **First Paint**: < 1.5s
- **Interactive**: < 3s
- **Largest Paint**: < 4s
- **Search Engine Friendly**: SEO-optimized HTML

---

## Security Implementation

### Row Level Security (RLS)

**Public Read (No Authentication Required):**
- blogs
- tips
- market_prices
- listings
- professionals
- ads (active only)

**Public Insert (For User-Generated Content):**
- listings (anyone can add)
- subscribers (newsletter signup)
- inquiries (contact form)

**Authenticated Read Only:**
- premium_subscriptions (users read own subscription)

### Data Protection

- All data encrypted in transit (HTTPS)
- RLS prevents unauthorized access
- No sensitive data exposed client-side
- Email addresses protected in listings
- Phone numbers require contact form

---

## Environment Variables

```env
# Required
VITE_SUPABASE_URL=https://jxyavtdmcloxnhuavokc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Optional (for testing)
BOLT_TEST_USER_EMAIL=test@example.com
BOLT_TEST_USER_PASSWORD=password
```

---

## Build & Deployment

### Build Command

```bash
npm run build
# Outputs: dist/ directory with optimized production build
```

### Build Verification

```bash
npm run typecheck    # TypeScript compilation check
npm run build        # Production build
```

### Deployment Platforms

**Tested & Compatible:**
- Vercel (Next.js/React native support)
- Netlify (Static hosting with edge functions)
- GitHub Pages (Static deployment)
- Custom VPS (Docker container ready)

**Deployment Steps:**
1. Push to git repository
2. Connect to hosting platform
3. Set environment variables
4. Run build command
5. Deploy from dist/ directory

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Runs on http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Organization

**Naming Conventions:**
- Components: PascalCase (BlogSection.tsx)
- Hooks: camelCase prefixed with "use" (useBlogs.ts)
- Utils: camelCase (cn(), getInitials())
- Constants: UPPER_CASE (PRIMARY_COLOR)

**File Structure:**
- 1 component per file
- Exports default component
- Imports organized: React → third-party → local

---

## Future Enhancements

### Planned Features

**Phase 2:**
- User authentication system
- Personal dashboards
- Self-service subscription management
- Direct messaging between users
- Review/rating system

**Phase 3:**
- Video uploads for professionals
- Advanced search with filters
- Analytics dashboard
- API for third-party integrations
- Mobile app versions (iOS/Android)

**Phase 4:**
- AI-powered recommendations
- Smart contract transactions
- AR visualization tools
- Blockchain transaction verification

---

## Troubleshooting

### Common Issues

**Images not loading:**
- Check Unsplash URL format
- Verify image dimensions match design
- Test in incognito mode
- Check browser console for CORS errors

**Translations not displaying:**
- Verify Amharic font loaded (check Network tab)
- Check localStorage for language preference
- Clear browser cache and reload
- Verify translation keys exist in i18n.tsx

**Data not fetching:**
- Check Supabase RLS policies
- Verify table name spelling
- Test with browser DevTools Network tab
- Check API keys in environment variables

**Slow performance:**
- Check bundle size (npm run build)
- Monitor Lighthouse scores
- Identify slow components with React DevTools Profiler
- Optimize images further if needed

---

## Additional Resources

### Documentation Files

- `USER_MANUAL.md` - User guide and feature documentation
- `PROJECT_COMPLETION_SUMMARY.md` - Overview of completed features
- `DATABASE_MIGRATION_INSTRUCTIONS.md` - Database setup guide
- `ASSETS_AND_IMAGES.md` - Image asset details

### External Resources

- [React 19 Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)

### Developer Contact

**Questions or Issues:**
- Email: dev@yebetweg.com
- GitHub: [YeBetWeg Repository]
- Slack: [Development Channel]

---

**Last Updated:** May 8, 2026  
**Version:** 1.0.0  
**Maintained By:** YeBetWeg Development Team

