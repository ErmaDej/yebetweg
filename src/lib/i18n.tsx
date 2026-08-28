import * as React from "react"

export type Language = "am" | "en"

export type TranslationKey =
  | "nav.knowledge"
  | "nav.tips"
  | "nav.market"
  | "nav.marketplace"
  | "nav.professionals"
  | "nav.premium"
  | "nav.contact"
  | "hero.headline"
  | "hero.subline"
  | "hero.cta.explore"
  | "hero.cta.community"
  | "hero.cta.marketplace"
  | "hero.stat.members"
  | "hero.stat.professionals"
  | "hero.stat.listings"
  | "blog.title"
  | "blog.subtitle"
  | "blog.filter.all"
  | "blog.filter.construction"
  | "blog.filter.philosophy"
  | "blog.filter.market"
  | "blog.filter.regulations"
  | "blog.filter.materials"
  | "blog.readMore"
  | "blog.minRead"
  | "tips.title"
  | "tips.subtitle"
  | "tips.unlockPremium"
  | "tips.free"
  | "tips.premium"
  | "market.title"
  | "market.subtitle"
  | "market.material"
  | "market.unit"
  | "market.price"
  | "market.change"
  | "market.updated"
  | "market.unlock"
  | "market.report"
  | "marketplace.title"
  | "marketplace.subtitle"
  | "marketplace.sale"
  | "marketplace.rent"
  | "marketplace.land"
  | "marketplace.materials"
  | "marketplace.services"
  | "marketplace.jobs"
  | "marketplace.listYours"
  | "marketplace.commission"
  | "marketplace.contact"
  | "marketplace.search"
  | "marketplace.location"
  | "professionals.title"
  | "professionals.subtitle"
  | "professionals.hire"
  | "professionals.join"
  | "professionals.architect"
  | "professionals.engineer"
  | "professionals.contractor"
  | "professionals.electrician"
  | "professionals.plumber"
  | "professionals.mason"
  | "professionals.surveyor"
  | "premium.title"
  | "premium.subtitle"
  | "premium.free"
  | "premium.pro"
  | "premium.month"
  | "premium.feature.blogs"
  | "premium.feature.prices"
  | "premium.feature.tips"
  | "premium.feature.listings"
  | "premium.feature.contact"
  | "premium.feature.priority"
  | "premium.feature.analytics"
  | "premium.feature.consultation"
  | "premium.feature.alerts"
  | "premium.feature.report"
  | "premium.paymentHeadline"
  | "premium.paymentDescription"
  | "premium.getStarted"
  | "premium.choosePlan"
  | "social.title"
  | "social.subtitle"
  | "social.youtube"
  | "social.tiktok"
  | "social.telegram"
  | "social.facebook"
  | "social.joinTelegram"
  | "contact.title"
  | "contact.subtitle"
  | "contact.name"
  | "contact.email"
  | "contact.phone"
  | "contact.subject"
  | "contact.message"
  | "contact.send"
  | "contact.general"
  | "contact.consultation"
  | "contact.listing"
  | "contact.hiring"
  | "contact.advertising"
  | "contact.support"
  | "footer.newsletter"
  | "footer.newsletterPlaceholder"
  | "footer.subscribe"
  | "footer.quickLinks"
  | "footer.audience.homeowners"
  | "footer.audience.professionals"
  | "footer.audience.buyers"
  | "footer.copyright"
  | "ads.advertise"
  | "ads.label"
  | "common.verified"
  | "common.urgent"
  | "common.loading"
  | "common.etb"
  | "common.language"
  // Smart Search & Filter
  | "search.placeholder"
  | "search.filters"
  | "search.reset"
  | "search.results"
  | "search.noResults"
  | "search.adjustTerms"
  | "search.on"
  | "search.off"
  | "search.sortBy"
  | "search.relevance"
  | "search.recent"
  | "search.popular"
  | "search.priceLow"
  | "search.priceHigh"
  | "filter.category"
  | "filter.priceRange"
  | "filter.location"
  | "filter.source"
  | "filter.rating"
  | "filter.experience"
  | "filter.freshness"
  | "filter.city"
   | "filter.clear"
   | "filter.all"
   // Dashboard
   | "dashboard.title"
   | "dashboard.currentPlan"
   | "dashboard.accessStrength"
   | "dashboard.tab.profile"
   | "dashboard.tab.settings"
   | "dashboard.tab.activity"
   | "dashboard.tab.admin"
   | "dashboard.stat.plan"
   | "dashboard.stat.listings"
   | "dashboard.stat.inquiries"
   | "dashboard.stat.rfqs"
   | "dashboard.stat.payments"
   | "dashboard.loadMore"
   | "dashboard.loadMoreRfqs"
   | "dashboard.noActivity"
   | "dashboard.noRfqs"
   | "dashboard.submitRfq"
   | "dashboard.assistant.title"
   | "dashboard.assistant.subtitle"
   | "dashboard.quickActions.title"
   | "dashboard.quickActions.desc.free"
   | "dashboard.quickActions.desc.admin"
   | "dashboard.quickActions.desc.paid"
   | "dashboard.plan.free"
   | "dashboard.plan.premium"
   | "dashboard.plan.pro"
   | "dashboard.plan.admin"
   | "dashboard.subscription.manage"
   | "dashboard.benefits.title"
   | "dashboard.benefit.free.estimate"
   | "dashboard.benefit.free.prices"
   | "dashboard.benefit.free.professionals"
   | "dashboard.benefit.free.rfq"
   | "dashboard.benefit.premium.insights"
   | "dashboard.benefit.premium.priorityRfq"
   | "dashboard.benefit.premium.badge"
   | "dashboard.benefit.premium.exportPdf"
   | "dashboard.benefit.pro.boqExport"
   | "dashboard.benefit.pro.analytics"
   | "dashboard.benefit.pro.unlimitedRfq"
   | "dashboard.benefit.pro.support"
   | "dashboard.benefit.admin.moderation"
   | "dashboard.benefit.admin.users"
   | "dashboard.benefit.admin.analytics"
   | "dashboard.benefit.admin.pricing"
   | "dashboard.cta.upgrade"
   | "dashboard.cta.upgradeToPremium"
   | "dashboard.cta.upgradeToPro"
   | "dashboard.cta.explorePro"
    | "dashboard.cta.reviewOps"
    | "dashboard.assistant.placeholder"
    | "dashboard.assistant.send"
    | "dashboard.assistant.quick.myRfqs"
    | "dashboard.assistant.quick.profile"
    | "dashboard.assistant.quick.prices"
    | "dashboard.assistant.quick.boq"
    | "dashboard.assistant.quick.pro"
    | "dashboard.assistant.fallback"

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    "nav.knowledge": "Knowledge Hub",
    "nav.tips": "Tips",
    "nav.market": "Market Prices",
    "nav.marketplace": "Marketplace",
    "nav.professionals": "Professionals",
    "nav.premium": "Premium",
    "nav.contact": "Contact",
    "hero.headline": "Humanity is Built",
    "hero.subline": "Your complete construction companion — from foundation to finish",
    "hero.cta.explore": "Explore Knowledge",
    "hero.cta.community": "Join Community",
    "hero.cta.marketplace": "Browse Marketplace",
    "hero.stat.members": "Community Members",
    "hero.stat.professionals": "Verified Professionals",
    "hero.stat.listings": "Active Listings",
    "blog.title": "Knowledge Hub",
    "blog.subtitle": "Expert insights on construction, architecture, and the Ethiopian building industry",
    "blog.filter.all": "All",
    "blog.filter.construction": "Construction",
    "blog.filter.philosophy": "Philosophy",
    "blog.filter.market": "Market Insights",
    "blog.filter.regulations": "Regulations",
    "blog.filter.materials": "Materials",
    "blog.readMore": "Read More",
    "blog.minRead": "min read",
    "tips.title": "Construction Tips & Consultations",
    "tips.subtitle": "Expert advice to save you time and money on your building project",
    "tips.unlockPremium": "Unlock Premium Consultation",
    "tips.free": "Free",
    "tips.premium": "Premium",
    "market.title": "Market Prices",
    "market.subtitle": "Current construction material prices in Addis Ababa",
    "market.material": "Material",
    "market.unit": "Unit",
    "market.price": "Price (ETB)",
    "market.change": "Change",
    "market.updated": "Last Updated",
    "market.unlock": "Full market data saves you up to 15% on material costs",
    "market.report": "Report Price Change",
    "marketplace.title": "Marketplace",
    "marketplace.subtitle": "Connect with buyers, sellers, renters, and professionals across Ethiopia's construction ecosystem",
    "marketplace.sale": "Properties For Sale",
    "marketplace.rent": "Properties For Rent",
    "marketplace.land": "Land",
    "marketplace.materials": "Materials",
    "marketplace.services": "Professional Services",
    "marketplace.jobs": "Jobs",
    "marketplace.listYours": "List Your Property or Service",
    "marketplace.commission": "2% commission on successful property transactions. Material and service connections are free.",
    "marketplace.contact": "Contact",
    "marketplace.search": "Search listings...",
    "marketplace.location": "Location",
    "professionals.title": "Professionals Directory",
    "professionals.subtitle": "Find verified construction professionals or list your expertise",
    "professionals.hire": "Hire",
    "professionals.join": "Join as Professional",
    "professionals.architect": "Architect",
    "professionals.engineer": "Engineer",
    "professionals.contractor": "Contractor",
    "professionals.electrician": "Electrician",
    "professionals.plumber": "Plumber",
    "professionals.mason": "Mason",
    "professionals.surveyor": "Surveyor",
    "premium.title": "Premium Membership",
    "premium.subtitle": "Unlock the full power of YeBetWeg for your construction projects",
    "premium.free": "Free",
    "premium.pro": "Pro",
    "premium.month": "/month",
    "premium.feature.blogs": "Blog & article access",
    "premium.feature.prices": "Market price data",
    "premium.feature.tips": "Construction tips",
    "premium.feature.listings": "Add/Browse listings",
    "premium.feature.contact": "Direct contact reveal",
    "premium.feature.priority": "Priority listing placement",
    "premium.feature.analytics": "Market analytics dashboard",
    "premium.feature.consultation": "Expert consultation booking",
    "premium.feature.alerts": "Price change alerts",
    "premium.feature.report": "Monthly market report",
    "premium.paymentHeadline": "Secure local checkout with Chapa",
    "premium.paymentDescription": "Pay securely with Chapa — Ethiopia’s leading payment gateway supporting cards, banks, and mobile money.",
    "premium.getStarted": "Get Started",
    "premium.choosePlan": "Choose Plan",
    "social.title": "Stay Connected",
    "social.subtitle": "Follow us on social media for daily construction tips and market updates",
    "social.youtube": "Watch on YouTube",
    "social.tiktok": "Follow on TikTok",
    "social.telegram": "Join Telegram",
    "social.facebook": "Like on Facebook",
    "social.joinTelegram": "Join Our Telegram",
    "contact.title": "Get in Touch",
    "contact.subtitle": "Have questions about construction, listings, or our platform? We are here to help.",
    "contact.name": "Full Name",
    "contact.email": "Email Address",
    "contact.phone": "Phone Number",
    "contact.subject": "Subject",
    "contact.message": "Message",
    "contact.send": "Send Inquiry",
    "contact.general": "General Inquiry",
    "contact.consultation": "Construction Consultation",
    "contact.listing": "Listing Inquiry",
    "contact.hiring": "Professional Hiring",
    "contact.advertising": "Advertising",
    "contact.support": "Premium Support",
    "footer.newsletter": "Stay updated with construction insights",
    "footer.newsletterPlaceholder": "Enter your email",
    "footer.subscribe": "Subscribe",
    "footer.quickLinks": "Quick Links",
    "footer.audience.homeowners": "Homeowners",
    "footer.audience.professionals": "Professionals",
    "footer.audience.buyers": "Buyers & Sellers",
    "footer.copyright": "2026 YeBetWeg | All rights reserved",
    "ads.advertise": "Advertise With Us",
    "ads.label": "Advertisement",
    "common.verified": "Verified",
    "common.urgent": "Urgent",
    "common.loading": "Loading...",
    "common.etb": "ETB",
    "common.language": "አማ",
    "search.placeholder": "Search... (⌘K)",
    "search.filters": "Filters",
    "search.reset": "Reset",
    "search.results": "result(s)",
    "search.noResults": "No Results",
    "search.adjustTerms": "Try adjusting your search terms or filters",
    "search.on": "On",
    "search.off": "Off",
    "search.sortBy": "Sort By",
    "search.relevance": "Relevance",
    "search.recent": "Recent",
    "search.popular": "Popular",
    "search.priceLow": "Price: Low to High",
    "search.priceHigh": "Price: High to Low",
    "filter.category": "Category",
    "filter.priceRange": "Price Range",
    "filter.location": "Location",
    "filter.source": "Source",
    "filter.rating": "Rating",
    "filter.experience": "Experience",
    "filter.freshness": "Freshness",
    "filter.city": "City",
    "filter.clear": "Clear All",
     "filter.all": "All",
     "dashboard.title": "Dashboard",
     "dashboard.currentPlan": "Current Plan",
     "dashboard.accessStrength": "Access strength",
     "dashboard.tab.profile": "Profile",
     "dashboard.tab.settings": "Settings",
     "dashboard.tab.activity": "Activity",
     "dashboard.tab.admin": "Admin",
     "dashboard.stat.plan": "Plan",
     "dashboard.stat.listings": "Listings",
     "dashboard.stat.inquiries": "Inquiries",
     "dashboard.stat.rfqs": "RFQs",
     "dashboard.stat.payments": "Payments",
     "dashboard.loadMore": "Load more",
     "dashboard.loadMoreRfqs": "Load more RFQs",
     "dashboard.noActivity": "No activity yet",
     "dashboard.noRfqs": "No RFQs submitted yet",
     "dashboard.submitRfq": "Submit RFQ",
     "dashboard.assistant.title": "YeBetWeg Assistant",
     "dashboard.assistant.subtitle": "AI guidance coming soon — smarter quotes, BOQ help, and material insights.",
     "dashboard.quickActions.title": "Quick Actions",
     "dashboard.quickActions.desc.free": "Jump straight into what matters most",
     "dashboard.quickActions.desc.admin": "Operational shortcuts for the marketplace",
     "dashboard.quickActions.desc.paid": "Jump straight into what matters most",
     "dashboard.plan.free": "Free",
     "dashboard.plan.premium": "Premium",
     "dashboard.plan.pro": "Pro",
     "dashboard.plan.admin": "Admin",
     "dashboard.subscription.manage": "Manage Subscription",
     "dashboard.benefits.title": "Your plan includes",
     "dashboard.benefit.free.estimate": "Project estimates",
     "dashboard.benefit.free.prices": "Market prices",
     "dashboard.benefit.free.professionals": "Professionals directory",
     "dashboard.benefit.free.rfq": "Quote requests (limited)",
     "dashboard.benefit.premium.insights": "Detailed market insights",
     "dashboard.benefit.premium.priorityRfq": "Priority RFQ routing",
     "dashboard.benefit.premium.badge": "Verification badge",
     "dashboard.benefit.premium.exportPdf": "BOQ preview export",
     "dashboard.benefit.pro.boqExport": "BOQ export (PDF & Excel)",
     "dashboard.benefit.pro.analytics": "Advanced analytics",
     "dashboard.benefit.pro.unlimitedRfq": "Unlimited RFQs",
     "dashboard.benefit.pro.support": "Dedicated support",
     "dashboard.benefit.admin.moderation": "Marketplace moderation",
     "dashboard.benefit.admin.users": "User & role management",
     "dashboard.benefit.admin.analytics": "Operational analytics",
     "dashboard.benefit.admin.pricing": "Market price administration",
      "dashboard.cta.upgrade": "Upgrade access",
      "dashboard.cta.upgradeToPremium": "Upgrade to Premium",
      "dashboard.cta.upgradeToPro": "Upgrade to Pro",
      "dashboard.cta.explorePro": "Explore pro tools",
      "dashboard.cta.reviewOps": "Review operations",
      "dashboard.assistant.placeholder": "Ask about RFQs, profile strength, market prices, BOQ...",
      "dashboard.assistant.send": "Send",
      "dashboard.assistant.quick.myRfqs": "My RFQs",
      "dashboard.assistant.quick.profile": "Profile strength",
      "dashboard.assistant.quick.prices": "Market prices",
      "dashboard.assistant.quick.boq": "BOQ estimate",
      "dashboard.assistant.quick.pro": "Find a pro",
      "dashboard.assistant.fallback": "I can help with RFQs, profile, market prices, BOQ, and professionals.",
    },
   am: {
    "nav.knowledge": "ዕውቀት",
    "nav.tips": "ምክሮች",
    "nav.market": "ዋጋዎች",
    "nav.marketplace": "ገበያ",
    "nav.professionals": "ባለሙያዎች",
    "nav.premium": "ፕሪሚየም",
    "nav.contact": "ያግኙን",
    "hero.headline": "ቤት ይሠራ",
    "hero.subline": "ከመሠረት እስከ ጣሪያ ሙሉ የግንባታ አጋዥዎ",
    "hero.cta.explore": "ዕውቀት ይመልከቱ",
    "hero.cta.community": "ማህበረሰብ ይቀላጸፉ",
    "hero.cta.marketplace": "ገበያ ይመልከቱ",
    "hero.stat.members": "የማህበረሰብ አባላት",
    "hero.stat.professionals": "የተረጋገጡ ባለሙያዎች",
    "hero.stat.listings": "ንቁ ዝርዝሮች",
    "blog.title": "ዕውቀት ማዕከል",
    "blog.subtitle": "ስለ ግንባታ፣ አርክቴክቸር እና የኢትዮጵያ የግንባታ ኢንዱስትሪ ባለሙያ ግንዛቤዎች",
    "blog.filter.all": "ሁሉም",
    "blog.filter.construction": "ግንባታ",
    "blog.filter.philosophy": "ፍልስፍና",
    "blog.filter.market": "የገበያ ግንዛቤ",
    "blog.filter.regulations": "ደንቦች",
    "blog.filter.materials": "ቁሶች",
    "blog.readMore": "ተጨማሪ ያንብቡ",
    "blog.minRead": "ደቂቃ ንባብ",
    "tips.title": "የግንባታ ምክሮች እና ምክረ-ሰብ",
    "tips.subtitle": "በግንባታ ፕሮጀክትዎ ጊዜና ገንዘብ ለማቆጠብ የባለሙያ ምክር",
    "tips.unlockPremium": "ፕሪሚየም ምክረ-ሰብ ይክፈቱ",
    "tips.free": "ነፃ",
    "tips.premium": "ፕሪሚየም",
    "market.title": "የገበያ ዋጋዎች",
    "market.subtitle": "በአዲስ አበባ የአሁኑ የግንባታ ቁሶች ዋጋ",
    "market.material": "ቁሱ",
    "market.unit": "መለክያ",
    "market.price": "ዋጋ (ብር)",
    "market.change": "ለውጥ",
    "market.updated": "መጨረሻ የተሻሻለው",
    "market.unlock": "ሙሉ የገበያ ውሂብ እስከ 15% በቁሶች ዋጋ ላይ ያቆጥብዎታል",
    "market.report": "የዋጋ ለውጥ ያሳውቁ",
    "marketplace.title": "ገበያ",
    "marketplace.subtitle": "በኢትዮጵያ የግንባታ ስርዓት ከገዢዎች፣ ሻጭዎች፣ ኪራዮተኞች እና ባለሙያዎች ጋር ይገናኙ",
    "marketplace.sale": "ለመሸጥ ንብረቶች",
    "marketplace.rent": "ለኪራይ ንብረቶች",
    "marketplace.land": "መሬት",
    "marketplace.materials": "ቁሶች",
    "marketplace.services": "የባለሙያ አገልግሎቶች",
    "marketplace.jobs": "ስራዎች",
    "marketplace.listYours": "ንብረት ወይም አገልግሎት ይዘርዝሩ",
    "marketplace.commission": "በስኬታማ የንብረት ግብይቶች 2% ኮሚሽን። የቁስ እና አገልግሎት ግንኙነቶች ነፃ ናቸው።",
    "marketplace.contact": "ያግኙ",
    "marketplace.search": "ዝርዝሮች ፈልግ...",
    "marketplace.location": "ቦታ",
    "professionals.title": "የባለሙያዎች ማውጫ",
    "professionals.subtitle": "የተረጋገጡ የግንባታ ባለሙያዎች ያግኙ ወይም ብቁነትዎን ያሳዩ",
    "professionals.hire": "ቅጥያ",
    "professionals.join": "እንደ ባለሙያ ይቀላጸፉ",
    "professionals.architect": "አርክቴክት",
    "professionals.engineer": "መሐንዲስ",
    "professionals.contractor": "ቋሚ",
    "professionals.electrician": "ኤሌክትሪሻን",
    "professionals.plumber": "ውሃ ቴክኒሻን",
    "professionals.mason": "ጭብጥ",
    "professionals.surveyor": "መለክያ",
    "premium.title": "ፕሪሚየም አባልነት",
    "premium.subtitle": "ለግንባታ ፕሮጀክቶችዎ የYeBetWeg ሙሉ ኃይል ይክፈቱ",
    "premium.free": "ነፃ",
    "premium.pro": "ፕሮ",
    "premium.month": "/ወር",
    "premium.feature.blogs": "ብሎግ እና መጣጥፍ መዳረሻ",
    "premium.feature.prices": "የገበያ ዋጋ ውሂብ",
    "premium.feature.tips": "የግንባታ ምክሮች",
    "premium.feature.listings": "ዝርዝሮችን ያክሉ/ይመልከቱ",
    "premium.feature.contact": "ቀጥታ ግንኙነት መግለጫ",
    "premium.feature.priority": "ቅድላይ ዝርዝር አቀማመጥ",
    "premium.feature.analytics": "የገበያ ትንተና ዳሽቦርድ",
    "premium.feature.consultation": "የባለሙያ ምክር ቦታ",
    "premium.feature.alerts": "የዋጋ ለውጥ ማሳወቂያ",
    "premium.feature.report": "ወርሃዊ የገበያ ሪፖርት",
    "premium.paymentHeadline": "የታማኝ የአገልግሎት ጣቢያ በቻፓ",
    "premium.paymentDescription": "በቻፓ በደህንነት ክፍያዎን አክል፡ ካርድ፣ ባንኮች እና የሞባይል ገንዘብ የሚያደግፍ የኢትዮጵያ ዋነኛ የክፍያ ጋራ።",
    "premium.getStarted": "ይጀምሩ",
    "premium.choosePlan": "እቅድ ይምረጡ",
    "social.title": "ግንኙነት ይጠብቁ",
    "social.subtitle": "ለዕለታዊ የግንባታ ምክሮች እና የገበያ ዝመናዎች በማህበራዊ ሚዲያ ይከተሉን",
    "social.youtube": "በYouTube ይመልከቱ",
    "social.tiktok": "በTikTok ይከተሉ",
    "social.telegram": "በTelegram ይቀላጸፉ",
    "social.facebook": "በFacebook ይወዱ",
    "social.joinTelegram": "በTelegram ይቀላጸፉ",
    "contact.title": "ያግኙን",
    "contact.subtitle": "ስለ ግንባታ፣ ዝርዝሮች ወይም መድረኻችን ጥያቄዎች አሉዎት? ለመርዳት ዝግጁ ነን።",
    "contact.name": "ሙሉ ስም",
    "contact.email": "ኢሜይል",
    "contact.phone": "ስልክ ቁጥር",
    "contact.subject": "ርዕሰ ጉዳይ",
    "contact.message": "መልዕክት",
    "contact.send": "ጥያቄ ይላኩ",
    "contact.general": "አጠቃላይ ጥያቄ",
    "contact.consultation": "የግንባታ ምክር",
    "contact.listing": "የዝርዝር ጥያቄ",
    "contact.hiring": "ባለሙያ ቅጥያ",
    "contact.advertising": "ማስተባበያ",
    "contact.support": "ፕሪሚየም ድጋፍ",
    "footer.newsletter": "የግንባታ ግንዛቤዎች ይያውቁ",
    "footer.newsletterPlaceholder": "ኢሜይልዎን ያስገቡ",
    "footer.subscribe": "ይመዝገቡ",
    "footer.quickLinks": "ፈጣን ማገናኛዎች",
    "footer.audience.homeowners": "ቤት ባለቤቶች",
    "footer.audience.professionals": "ባለሙያዎች",
    "footer.audience.buyers": "ገዢዎች እና ሻጭዎች",
    "footer.copyright": "2026 YeBetWeg | መብቱ በሕግ የተጠበቀ ነው",
    "ads.advertise": "ከእኛ ጋር ያስተምሩ",
    "ads.label": "ማስተባበያ",
    "common.verified": "የተረጋገጠ",
    "common.urgent": "አስቸኳይ",
    "common.loading": "እየጭነቀ ነው...",
    "common.etb": "ብር",
    "common.language": "EN",
    "search.placeholder": "ይፈልጉ... (⌘K)",
    "search.filters": "ማጣሪያዎች",
    "search.reset": "አስጀምር",
    "search.results": "ውጤት(ዎች)",
    "search.noResults": "ምንም ውጤት የለም",
    "search.adjustTerms": "የፍለጋ ቃላትዎን ወይም ማጣሪያዎን ይመለሱ",
    "search.on": "በርቷል",
    "search.off": "ጠፍቷል",
    "search.sortBy": "ደርድር",
    "search.relevance": "ተገቢነት",
    "search.recent": "የቅርብ",
    "search.popular": "ታዋቂ",
    "search.priceLow": "ዋጋ: ዝቅተኛ ወደ ከፍተኛ",
    "search.priceHigh": "ዋጋ: ከፍተኛ ወደ ዝቅተኛ",
    "filter.category": "ምድብ",
    "filter.priceRange": "የዋጋ ክልል",
    "filter.location": "ቦታ",
    "filter.source": "ምንጭ",
    "filter.rating": "ደረጃ",
    "filter.experience": "ልምድ",
    "filter.freshness": "አዲስነት",
    "filter.city": "ከተማ",
    "filter.clear": "ሁሉንም ሰርዝ",
     "filter.all": "ሁሉም",
     "dashboard.title": "ዳሽቦርድ",
     "dashboard.currentPlan": "የአሁኑ እቅድ",
     "dashboard.accessStrength": "የመዳረሻ ጥንካሬ",
     "dashboard.tab.profile": "ገለጻ",
     "dashboard.tab.settings": "ቅናሾች",
     "dashboard.tab.activity": "እንቅስቃሴ",
     "dashboard.tab.admin": "አስተዳዳሪ",
     "dashboard.stat.plan": "እቅድ",
     "dashboard.stat.listings": "ዝርዝሮች",
     "dashboard.stat.inquiries": "ጥያቄዎች",
     "dashboard.stat.rfqs": "የዋጋ ጥያቄዎች",
     "dashboard.stat.payments": "ክፍያዎች",
     "dashboard.loadMore": "በቀላሉ ጨምር",
     "dashboard.loadMoreRfqs": "የዋጋ ጥያቄዎችን ጨምር",
     "dashboard.noActivity": "እንቅስቃሴ የለም",
     "dashboard.noRfqs": "ገና ምንም የዋጋ ጥያቄ አልተላከም",
     "dashboard.submitRfq": "ጥያቄ ላክ",
     "dashboard.assistant.title": "የYeBetWeg ረዳት",
     "dashboard.assistant.subtitle": "AI ረዳት በቅርቡ ይመጣል — ብልህ ዋጋ፣ የBOQ እርዳታ እና የቁሳቁስ ግንዛቤዎች።",
     "dashboard.quickActions.title": "ፈጣን እርምጃዎች",
     "dashboard.quickActions.desc.free": "በቀጥታ ወደ በጣም አስፈላጊው ይሂዱ",
     "dashboard.quickActions.desc.admin": "ለገበያው የአሰራር አቋራጮች",
     "dashboard.quickActions.desc.paid": "በቀጥታ ወደ በጣም አስፈላጊው ይሂዱ",
     "dashboard.plan.free": "ነጻ",
     "dashboard.plan.premium": "ፕሪሚየም",
     "dashboard.plan.pro": "ፕሮ",
     "dashboard.plan.admin": "አስተዳዳሪ",
     "dashboard.subscription.manage": "ምዝገባ አስተዳድር",
"dashboard.benefits.title": "የእቅድዎ የሚያካትቱ",
      "dashboard.benefit.free.estimate": "የፕሮጀክት ወልታዊ አስተዋውቅ",
      "dashboard.benefit.free.prices": "የገበያ ዋጋዎች",
      "dashboard.benefit.free.professionals": "የባለሙያዎች የመረጃ ቤት",
      "dashboard.benefit.free.rfq": "የዋጋ ጥያቄዎች (የተላለፈ)",
      "dashboard.benefit.premium.insights": "የገበያ ዝርዝር ግንዛቤዎች",
      "dashboard.benefit.premium.priorityRfq": "የቅብል የዋጋ ጥያቄ ቅርጸት",
      "dashboard.benefit.premium.badge": "የማረጋገጫ ልዩነት",
      "dashboard.benefit.premium.exportPdf": "የBOQ ወልታዊ አያዛዝ",
      "dashboard.benefit.pro.boqExport": "የBOQ መደበኛ (PDF እና Excel)",
      "dashboard.benefit.pro.analytics": "የቀጥታ ትንተናዎች",
      "dashboard.benefit.pro.unlimitedRfq": "ዘላለጠ የዋጋ ጥያቄዎች",
      "dashboard.benefit.pro.support": "የቀጠረ ድጋፍ",
      "dashboard.benefit.admin.moderation": "የገበያ የሚያሳይ እርዳታ",
      "dashboard.benefit.admin.users": "አሰራር እና የሚያውቅ የተጠቃሚዎች",
      "dashboard.benefit.admin.analytics": "የኦፕሬሽን ትንተና",
      "dashboard.benefit.admin.pricing": "የገበያ ዋጋ አስተዳዳሪ",
      "dashboard.cta.upgrade": "መዳረሻ ያሻሽሉ",
      "dashboard.cta.upgradeToPremium": "ወደ ፕሪሚየም ይቅርቡ",
      "dashboard.cta.upgradeToPro": "ወደ ፕሮ ዝቅ",
      "dashboard.cta.explorePro": "የፕሮ መሳሪያዎችን ያጠቀሙ",
      "dashboard.cta.reviewOps": "ኦፕሬሽን ይመልከቱ",
      "dashboard.assistant.placeholder": "ለዋጋ ጥያቄዎች፣ ግምገማ ጥንኩር፣ የገበያ ዋጋ፣ BOQ ጥያቄ ይጠይቁ።",
      "dashboard.assistant.send": "አስቀምጥ",
      "dashboard.assistant.quick.myRfqs": "የዋጋ ጥያቄዎች",
      "dashboard.assistant.quick.profile": "የግምገማ ጥንኩር",
      "dashboard.assistant.quick.prices": "የገበያ ዋጋዎች",
      "dashboard.assistant.quick.boq": "BOQ ወልታዊ",
      "dashboard.assistant.quick.pro": "ባለሙያ ይፈልጉ",
      "dashboard.assistant.fallback": "ለዋጋ ጥያቄዎች፣ የግምገማ ጥንኩር፣ የገበያ ዋጋ፣ BOQ እና ባለሙያዎች ጥያቄ ልክ ነው የማይደርሱት።",
    },
  }

const LanguageContext = React.createContext<{
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}>({
  language: "en",
  setLanguage: () => {},
  t: (key) => translations.en[key],
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = React.useState<Language>(() => {
    const stored = localStorage.getItem("yebetweg-lang")
    return stored === "am" ? "am" : "en"
  })

  const handleSetLanguage = React.useCallback((lang: Language) => {
    localStorage.setItem("yebetweg-lang", lang)
    setLanguage(lang)
  }, [])

  const t = React.useCallback(
    (key: TranslationKey) => translations[language][key],
    [language]
  )

  const value = React.useMemo(
    () => ({ language, setLanguage: handleSetLanguage, t }),
    [language, handleSetLanguage, t]
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage() {
  return React.useContext(LanguageContext)
}
