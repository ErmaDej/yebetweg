import * as React from "react"

type Language = "am" | "en"

type TranslationKey =
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
    "premium.feature.listings": "Browse listings",
    "premium.feature.contact": "Direct contact reveal",
    "premium.feature.priority": "Priority listing placement",
    "premium.feature.analytics": "Market analytics dashboard",
    "premium.feature.consultation": "Expert consultation booking",
    "premium.feature.alerts": "Price change alerts",
    "premium.feature.report": "Monthly market report",
    "premium.paymentHeadline": "Secure local checkout with Chapa or TeleBirr",
    "premium.paymentDescription": "Choose the payment method that works best for you. TeleBirr support is built for Ethiopia’s leading mobile money users.",
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
    "premium.feature.listings": "ዝርዝሮችን ይመልከቱ",
    "premium.feature.contact": "ቀጥታ ግንኙነት መግለጫ",
    "premium.feature.priority": "ቅድላይ ዝርዝር አቀማመጥ",
    "premium.feature.analytics": "የገበያ ትንተና ዳሽቦርድ",
    "premium.feature.consultation": "የባለሙያ ምክር ቦታ",
    "premium.feature.alerts": "የዋጋ ለውጥ ማሳወቂያ",
    "premium.feature.report": "ወርሃዊ የገበያ ሪፖርት",
    "premium.paymentHeadline": "የታማኝ የአገልግሎት ጣቢያ በቻፓ ወይም በቴሌቢር",
    "premium.paymentDescription": "ለእርስዎ የሚሰራውን የክፍያ ዘዴ ይምረጡ። የቴሌቢር ድጋፍ ለኢትዮጵያ ዋነኛ የሞባይል ገንዘብ ተጠቃሚዎች ተዘጋጀ ነው።",
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
