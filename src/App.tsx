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
import { ContactSection } from "@/components/sections/ContactSection"
import { AdSlot, AdvertiseWithUs } from "@/components/sections/AdsSection"
import { Dashboard } from "@/pages/Dashboard"
import { ProtectedRoute } from "@/components/ProtectedRoute"

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <FloatingSocialBar />

      <main>
        <HeroSection />

        <AdSlot position="leaderboard" />

        <BlogSection />

        <TipsSection />

        <AdSlot position="leaderboard" />

        <MarketPricesSection />

        <AdSlot position="leaderboard" />

        <MarketplaceSection />

        <ProfessionalsSection />

        <PremiumSection />

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
  const [currentPage, setCurrentPage] = useState<"home" | "dashboard">("home")

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.pathname
      if (hash.includes("/dashboard")) {
        setCurrentPage("dashboard")
      } else {
        setCurrentPage("home")
      }
    }

    handleHashChange()
    window.addEventListener("popstate", handleHashChange)
    return () => window.removeEventListener("popstate", handleHashChange)
  }, [])

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

  return <HomePage />
}

export default App
