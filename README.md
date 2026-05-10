# YeBetWeg - Construction Knowledge Platform & Marketplace

![YeBetWeg Logo](public/vite.svg)

**YeBetWeg (የቤት-ወግ)** = "Way of Building" in Amharic

A comprehensive construction knowledge platform and marketplace connector for Ethiopia, bridging homeowners, professionals, builders, and suppliers through a bilingual (English/Amharic) interface.

---

## 🌟 Features

### Core Platform
- **📚 Knowledge Hub** - 8 bilingual construction articles with expert insights
- **💡 Construction Tips** - 10 expert tips (6 free, 4 premium-gated)
- **💰 Market Prices** - Real-time pricing for 15+ construction materials in Addis Ababa
- **🏪 Marketplace** - Multi-party listings (properties, materials, services) with 12 active listings
- **👨‍💼 Professionals Directory** - 6 verified construction professionals with portfolio images
- **🎯 Premium Membership** - 3-tier subscription (Free/Premium/Pro)
- **📢 Advertisement Platform** - 3 ad slots across multiple placements
- **🌐 Social Integration** - YouTube, TikTok, Telegram, Facebook connections

### User Experience
- ✅ **Bilingual Interface** - Complete English & Amharic support
- ✅ **Dark/Light Mode** - Theme switching with system preference support
- ✅ **Mobile Responsive** - Optimized for all device sizes
- ✅ **Secure Data** - Row Level Security (RLS) on all database tables
- ✅ **Real-time Updates** - Supabase integration for live data
- ✅ **Professional UI** - 60+ shadcn/ui components with custom theming

---

## 🚀 Quick Start

### For Users

1. **Visit the Platform**
   ```
   https://yebetweg.com
   ```

2. **Browse Content**
   - No signup required to view all free content
   - Switch language: Click AM/EN in top navigation
   - Toggle dark mode: Click sun/moon icon

3. **Get Started**
   - Read construction articles in Knowledge Hub
   - Browse current material prices
   - Check marketplace listings
   - View verified professionals
   - Subscribe to newsletter

### For Developers

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   # Opens on http://localhost:5173
   ```

3. **Build for Production**
   ```bash
   npm run build
   # Output in dist/ directory
   ```

4. **Type Check**
   ```bash
   npm run typecheck
   ```

---

## 📊 Project Structure

```
YeBetWeg/
├── src/
│   ├── components/          # React components
│   │   ├── layout/         # Navigation, footer, header
│   │   ├── sections/       # Page sections (10 total)
│   │   ├── icons/          # Custom SVG icons
│   │   └── ui/             # shadcn components (60+)
│   ├── hooks/              # Custom React hooks
│   │   ├── useBlogs.ts
│   │   ├── useTips.ts
│   │   ├── useMarketPrices.ts
│   │   ├── useListings.ts
│   │   ├── useProfessionals.ts
│   │   └── useInView.ts
│   ├── lib/
│   │   ├── i18n.tsx        # Internationalization (120+ keys)
│   │   ├── supabase.ts     # Database client
│   │   └── utils.ts        # Utility functions
│   ├── App.tsx             # Main application
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles & animations
├── supabase/
│   └── migrations/         # Database schema (SQL)
├── public/                 # Static assets
├── docs/                   # Documentation
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── tailwind.config.js      # Tailwind CSS configuration
```

---

## 🗄️ Database Schema

### 9 Tables with RLS Security

| Table | Records | Purpose |
|-------|---------|---------|
| **blogs** | 8 | Construction articles |
| **tips** | 10 | Expert tips (6 free, 4 premium) |
| **market_prices** | 15 | Material pricing data |
| **listings** | 12 | Marketplace items (5 categories) |
| **professionals** | 6 | Verified professionals directory |
| **ads** | 3 | Advertisement slots |
| **subscribers** | - | Newsletter signups |
| **inquiries** | - | Contact form submissions |
| **premium_subscriptions** | - | Membership tracking |

**Total Seed Data:** 54+ records with realistic Ethiopian construction context

---

## 🎨 Technology Stack

### Frontend
- **React 19** - Modern component library
- **TypeScript** - Type-safe development
- **Vite 7** - Fast build tool
- **Tailwind CSS v4** - Utility-first styling with OKLCH colors
- **shadcn/ui** - Accessible component library (60+ components)
- **Lucide React** - Icon library

### Backend
- **Supabase** - PostgreSQL database
- **RLS Policies** - Row-level security
- **Real-time Subscriptions** - Live data updates

### Styling & Animation
- **OKLCH Color System** - Modern color space
- **CSS Animations** - Typewriter, marquee, fade-in-up, float, shimmer
- **Glassmorphism** - Blur effects for premium content
- **Responsive Design** - Mobile-first approach

### Internationalization
- **React Context** - State management
- **Custom i18n System** - 120+ translation keys
- **localStorage** - Persistence
- **Noto Sans Ethiopic** - Amharic font support

---

## 📱 Browser Support

- **Chrome/Edge** - Latest 2 versions
- **Firefox** - Latest 2 versions
- **Safari** - Latest 2 versions
- **Mobile** - iOS Safari, Chrome for Android

---

## 🌍 Language Support

### Fully Supported Languages

- **English (EN)** - Complete interface
- **Amharic (አማርኛ)** - Complete interface with proper character rendering

### Switching Languages

Click the **AM/EN** toggle in the top navigation bar to instantly switch between English and Amharic. Your preference is saved for future visits.

---

## 💳 Membership Tiers

### Free (ነፃ)
- All blog articles
- 6 construction tips
- Basic market prices (5 rows)
- Browse all listings
- Join professional directory

### Premium (ፕሪሚየም) - 500 ብር/month
- All Free features
- All 10 construction tips (premium included)
- Full market price database
- Featured listing placement
- Priority contact reveals

### Pro (ፕሮ) - 1200 ብር/month
- All Premium features
- Market analytics dashboard
- Price trend analysis
- Expert consultation booking
- Price change alerts
- Monthly market report

---

## 🔒 Security Features

### Row Level Security (RLS)
- Public read access on content tables (blogs, tips, prices, listings, professionals, ads)
- Public insert on user-generated content (listings, inquiries, newsletter)
- Authenticated users can only access their own subscription data
- All data encrypted in transit (HTTPS)

### Data Protection
- No sensitive data exposed in client-side code
- Email addresses hidden in listings
- Phone numbers protected behind contact form
- Secure payment processing via Chapa

---

## 📈 Performance

### Bundle Size
- **CSS**: 139.86 KB (21.11 KB gzipped)
- **JavaScript**: 642.10 KB (185.81 KB gzipped)
- **Total**: ~207 KB gzipped

### Optimizations
- Lazy-loaded images from Unsplash CDN
- Intersection Observer for scroll animations
- Code splitting ready
- CSS minification
- Efficient database queries with indexes

---

## 📖 Documentation

### User Documentation
- **[USER_MANUAL.md](USER_MANUAL.md)** - Comprehensive user guide (15+ sections)
  - Getting started
  - Feature explanations
  - Premium membership details
  - Marketplace guidelines
  - 30+ FAQs
  - Support information

### Developer Documentation
- **[TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md)** - Complete technical guide (20+ sections)
  - Architecture overview
  - Database schema details
  - Component structure
  - i18n implementation
  - Styling system
  - Build & deployment

### Quick References
- **[QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** - Quick reference guide
  - 30-second intro
  - Common use cases
  - Navigation tips
  - Pro tips
  - Quick FAQs

### Additional Resources
- **[PROJECT_COMPLETION_SUMMARY.md](PROJECT_COMPLETION_SUMMARY.md)** - Feature overview
- **[DATABASE_MIGRATION_INSTRUCTIONS.md](DATABASE_MIGRATION_INSTRUCTIONS.md)** - Setup guide
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Implementation details

---

## 🛠️ Development

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run type checking
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables
```env
VITE_SUPABASE_URL=https://jxyavtdmcloxnhuavokc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Deployment

The application can be deployed to:
- ✅ **Vercel** (Recommended)
- ✅ **Netlify**
- ✅ **GitHub Pages**
- ✅ **Custom VPS**

---

## 📞 Support & Contact

### User Support
- **Email**: support@yebetweg.com
- **Phone**: +251 911 234 567
- **Hours**: Monday-Saturday, 8:00 AM - 6:00 PM EAT
- **Location**: Bole, Addis Ababa (Near Edna Mall, 3rd Floor)

### Social Media
- **YouTube**: [@yebetweg](https://youtube.com/@yebetweg)
- **Telegram**: [@yebetweg](https://t.me/yebetweg)
- **TikTok**: [@yebetweg](https://tiktok.com/@yebetweg)
- **Facebook**: [/yebetweg](https://facebook.com/yebetweg)

### Report Issues
- **Fraud/Scams**: fraud@yebetweg.com
- **Bugs**: bugs@yebetweg.com
- **Feedback**: feedback@yebetweg.com

---

## 🚀 Deployment Checklist

- [x] TypeScript compilation successful
- [x] Build passes without errors
- [x] Environment variables configured
- [x] Database migrations applied
- [x] Seed data populated
- [x] RLS policies enforced
- [x] Images optimized
- [x] Mobile responsiveness verified
- [x] Bilingual content verified
- [x] Documentation complete
- [x] Security audit passed

---

## 📋 Future Enhancements

### Coming Soon (Phase 2)
- User authentication system
- Personal account dashboards
- Self-service subscription management
- Direct messaging between users
- Review and rating system
- Image upload for listings

### Phase 3
- Advanced search with filters
- Analytics dashboard
- API for third-party developers
- Mobile app (iOS/Android)

### Phase 4
- AI-powered recommendations
- Smart contract integration
- AR visualization tools
- Blockchain verification

---

## 📝 License

**YeBetWeg - Construction Knowledge Platform**

This project is proprietary software. All rights reserved.

For licensing inquiries, contact: legal@yebetweg.com

---

## 🙏 Acknowledgments

Built with:
- React & TypeScript community
- Supabase team
- shadcn/ui components
- Unsplash photography
- Noto Sans Ethiopic font
- Tailwind CSS framework

---

## 📊 Stats

- **Total Components**: 60+ UI + 10 sections
- **Database Tables**: 9 (54+ records)
- **Translations**: 120+ keys (English & Amharic)
- **Images Integrated**: 29+ from Unsplash
- **Documentation**: 1000+ lines across 3 guides
- **Bundle Size**: 207 KB gzipped
- **Build Time**: ~7 seconds
- **TypeScript Errors**: 0

---

## 🌟 Key Milestones

- ✅ **Version 1.0** - Complete knowledge platform + marketplace (May 2026)
- ✅ Full bilingual support (English/Amharic)
- ✅ Mobile responsive design
- ✅ Secure database with RLS
- ✅ Premium membership system
- ✅ Real-time data integration
- ✅ Comprehensive documentation

---

## 🎯 Mission

**YeBetWeg bridges Ethiopia's construction community by providing:**
1. Actionable construction knowledge
2. Real-time market data
3. Professional networking
4. Secure marketplace for transactions
5. Verified professional directory

**Our Vision**: To empower Ethiopia's construction industry through accessible knowledge, trusted connections, and transparent market information.

---

**Platform**: YeBetWeg - የቤት-ወግ  
**Version**: 1.0.0  
**Status**: Production Ready ✅  
**Last Updated**: May 8, 2026

---

**Ready to connect Ethiopia's construction ecosystem!** 🏗️

For more information, visit our documentation files or contact support@yebetweg.com

