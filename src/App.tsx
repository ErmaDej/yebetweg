import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { FloatingSocialBar } from "@/components/layout/FloatingSocialBar"
import { HeroSection } from "@/components/sections/HeroSection"
import { BlogSection } from "@/components/sections/BlogSection"
import { TipsSection } from "@/components/sections/TipsSection"
import { BoqLiteSection } from "@/components/sections/BoqLiteSection"
import { MarketPricesSection } from "@/components/sections/MarketPricesSection"
import { MarketplaceSection } from "@/components/sections/MarketplaceSection"
import { ProfessionalsSection } from "@/components/sections/ProfessionalsSection"
import { SiteLogSection } from "@/components/sections/SiteLogSection"
import { PremiumSection } from "@/components/sections/PremiumSection"
import { SocialBridgeSection } from "@/components/sections/SocialBridgeSection"
import { VideoShowcaseSection } from "@/components/sections/VideoShowcaseSection"
import { ContactSection } from "@/components/sections/ContactSection"
import { AdSlot, AdvertiseWithUs } from "@/components/sections/AdsSection"
import { Dashboard } from "@/pages/Dashboard"
import { SearchResults } from "@/pages/SearchResults"
import { PaymentSuccessPage } from "@/pages/PaymentSuccessPage"
import { AuthCallbackPage } from "@/pages/AuthCallbackPage"
import { ResetPasswordPage } from "@/pages/ResetPasswordPage"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useSubscription, useUserProfile } from "@/hooks/useUserProfile"
import { getActivePlan } from "@/lib/entitlements"
import { scrollToAnchor } from "@/lib/navigation"

function HomePage() {
  const { profile } = useUserProfile()
  const { subscription } = useSubscription(profile)
  const activePlan = getActivePlan(profile, subscription)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <FloatingSocialBar />

      <main>
        <HeroSection />

        <VideoShowcaseSection />

        <AdSlot position="leaderboard" />

        <BlogSection />

        <TipsSection activePlan={activePlan} />

        <BoqLiteSection />

        <AdSlot position="leaderboard" />

        <MarketPricesSection activePlan={activePlan} />

        <AdSlot position="leaderboard" />

        <MarketplaceSection activePlan={activePlan} />

        <ProfessionalsSection />

        <SiteLogSection />

        <PremiumSection activePlan={activePlan} subscription={subscription} />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SocialBridgeSection />
            </div>
            <div className="space-y-6">
              <AdSlot position="sidebar" />
              <AdvertiseWithUs />
            </div>
          </div>
        </div>

        <ContactSection />
      </main>

      <Footer />
    </div>
  )
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      {children}
      <Footer />
    </div>
  )
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <ProtectedRoute>{children}</ProtectedRoute>
      <Footer />
    </div>
  )
}

// Handle hash-based anchor scrolling within the home page
function HomePageWrapper() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      scrollToAnchor(location.hash)
    }
  }, [location.hash])

  return <HomePage />
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePageWrapper />} />
        <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
        <Route path="/search" element={<MainLayout><SearchResults /></MainLayout>} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* Legacy hash-based routes redirect to home with hash for backward compatibility */}
        <Route path="/:legacy*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App