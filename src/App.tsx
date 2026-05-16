import { useState, useEffect } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { FloatingSocialBar } from "@/components/layout/FloatingSocialBar"
import { HeroSection } from "@/components/sections/HeroSection"
import { BlogSection } from "@/components/sections/BlogSection"
import { TipsSection } from "@/components/sections/TipsSection"
import { MarketPricesSection } from "@/components/sections/MarketPricesSection"
import { MarketplaceSection } from "@/components/sections/MarketplaceSection"
import { ProfessionalsSection } from "@/components/sections/ProfessionalsSection"
import { PremiumSection } from "@/components/sections/PremiumSection"
import { SocialBridgeSection } from "@/components/sections/SocialBridgeSection"
import { VideoShowcaseSection } from "@/components/sections/VideoShowcaseSection"
import { ContactSection } from "@/components/sections/ContactSection"
import { AdSlot, AdvertiseWithUs } from "@/components/sections/AdsSection"
import { Dashboard } from "@/pages/Dashboard"
import { SearchResults } from "@/pages/SearchResults"
import { PaymentSuccessPage } from "@/pages/PaymentSuccessPage"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useSubscription, useUserProfile } from "@/hooks/useUserProfile"
import type { PremiumTier } from "@/types/payment"

function HomePage() {
  const { profile } = useUserProfile()
  const { subscription } = useSubscription(profile)
  const activePlan: PremiumTier =
    profile?.role === "admin"
      ? "pro"
      : subscription?.status === "active" && subscription.isActive
        ? subscription.tier
        : "free"

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

        <AdSlot position="leaderboard" />

        <MarketPricesSection activePlan={activePlan} />

        <AdSlot position="leaderboard" />

        <MarketplaceSection activePlan={activePlan} />

        <ProfessionalsSection />

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

export function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "dashboard" | "search" | "payment">("home")

  useEffect(() => {
    const handleHashChange = () => {
      const pathname = window.location.pathname
      const search = window.location.search
      
      if (pathname.includes("/dashboard")) {
        setCurrentPage("dashboard")
      } else if (pathname.includes("/search") || search.includes("q=")) {
        setCurrentPage("search")
      } else if (pathname.includes("/payment/success")) {
        setCurrentPage("payment")
      } else {
        setCurrentPage("home")
      }
    }

    handleHashChange()
    window.addEventListener("popstate", handleHashChange)
    return () => window.removeEventListener("popstate", handleHashChange)
  }, [])

  useEffect(() => {
    if (currentPage !== "home" || !window.location.hash) return

    window.setTimeout(() => {
      document
        .getElementById(window.location.hash.slice(1))
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 0)
  }, [currentPage])

  if (currentPage === "dashboard") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
        <Footer />
      </div>
    )
  }

  if (currentPage === "search") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <SearchResults />
        <Footer />
      </div>
    )
  }

  if (currentPage === "payment") {
    return <PaymentSuccessPage />
  }

  return <HomePage />
}

export default App
