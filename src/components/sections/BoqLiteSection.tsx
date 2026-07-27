import { useMemo, useState } from "react"
import { Calculator, FileText, Send, ShieldCheck, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useInView } from "@/hooks/useInView"
import { useLanguage } from "@/lib/i18n"
import { navigateTo } from "@/lib/navigation"

type ProjectType = "residential" | "apartment" | "commercial" | "renovation"
type City = "addis_ababa" | "adama" | "hawassa" | "bahir_dar" | "mekelle" | "dire_dawa" | "outside_addis"
type FinishLevel = "basic" | "standard" | "premium"

const cityMultipliers: Record<City, number> = {
  addis_ababa: 1,
  adama: 0.92,
  hawassa: 0.95,
  bahir_dar: 0.94,
  mekelle: 0.96,
  dire_dawa: 0.93,
  outside_addis: 0.9,
}

const projectMultipliers: Record<ProjectType, number> = {
  residential: 1,
  apartment: 1.08,
  commercial: 1.15,
  renovation: 0.65,
}

const finishCosts: Record<FinishLevel, number> = {
  basic: 21000,
  standard: 28500,
  premium: 38000,
}

const labels = {
  en: {
    title: "BOQ Lite Estimator",
    subtitle: "Estimate a project budget in minutes, then move toward supplier quotes and professional review.",
    projectType: "Project type",
    city: "City",
    area: "Built-up area",
    floors: "Floors",
    finish: "Finish level",
    contingency: "Contingency",
    estimate: "Estimated budget",
    perM2: "Cost per m2",
    material: "Materials",
    structure: "Structure",
    labor: "Labor",
    overhead: "Overhead",
    assumptions: "Assumptions",
    export: "Unlock BOQ Pro export",
    rfq: "Request supplier quotes",
    review: "Find a professional review",
    confidence: "Planning estimate",
    disclaimer: "Use this as a planning estimate. Final BOQ needs drawings, site conditions, specifications, and current supplier quotes.",
    residential: "Residential house",
    apartment: "Apartment / mixed-use",
    commercial: "Small commercial",
    renovation: "Renovation / finishing",
    addis_ababa: "Addis Ababa",
    adama: "Adama",
    hawassa: "Hawassa",
    bahir_dar: "Bahir Dar",
    mekelle: "Mekelle",
    dire_dawa: "Dire Dawa",
    outside_addis: "Outside Addis",
    basic: "Basic",
    standard: "Standard",
    premium: "Premium",
    sqm: "m2",
  },
  am: {
    title: "ቀላል BOQ ግምት",
    subtitle: "የፕሮጀክት በጀትዎን በፍጥነት ይገምቱ፣ ከዚያ ወደ የአቅራቢ ዋጋ ጥያቄ እና የባለሙያ ግምገማ ይቀጥሉ።",
    projectType: "የፕሮጀክት አይነት",
    city: "ከተማ",
    area: "የግንባታ ስፋት",
    floors: "ወለሎች",
    finish: "የፊኒሺንግ ደረጃ",
    contingency: "ተጨማሪ መጠባበቂያ",
    estimate: "የተገመተ በጀት",
    perM2: "ዋጋ በ m2",
    material: "ቁሳቁስ",
    structure: "መዋቅር",
    labor: "ሰራተኛ",
    overhead: "ኦቨርሄድ",
    assumptions: "መነሻ ግምቶች",
    export: "BOQ Pro ኤክስፖርት ክፈት",
    rfq: "የአቅራቢ ዋጋ ጠይቅ",
    review: "የባለሙያ ግምገማ ፈልግ",
    confidence: "የእቅድ ግምት",
    disclaimer: "ይህንን ለእቅድ ግምት ብቻ ይጠቀሙ። የመጨረሻ BOQ ስዕሎች፣ የሳይት ሁኔታ፣ ዝርዝር መግለጫ እና የአቅራቢ ዋጋ ይፈልጋል።",
    residential: "የመኖሪያ ቤት",
    apartment: "አፓርታማ / ድብልቅ",
    commercial: "ንግድ ግንባታ",
    renovation: "እድሳት / ፊኒሺንግ",
    addis_ababa: "አዲስ አበባ",
    adama: "አዳማ",
    hawassa: "ሀዋሳ",
    bahir_dar: "ባህር ዳር",
    mekelle: "መቀሌ",
    dire_dawa: "ድሬዳዋ",
    outside_addis: "ከአዲስ አበባ ውጭ",
    basic: "መሰረታዊ",
    standard: "መደበኛ",
    premium: "ፕሪሚየም",
    sqm: "m2",
  },
}

function formatEtb(value: number) {
  return `${Math.round(value).toLocaleString()} ETB`
}

export function BoqLiteSection() {
  const { language } = useLanguage()
  const { ref, isInView } = useInView()
  const text = labels[language]
  const [projectType, setProjectType] = useState<ProjectType>("residential")
  const [city, setCity] = useState<City>("addis_ababa")
  const [finishLevel, setFinishLevel] = useState<FinishLevel>("standard")
  const [area, setArea] = useState(180)
  const [floors, setFloors] = useState(2)
  const [contingency, setContingency] = useState(10)

  const estimate = useMemo(() => {
    const safeArea = Math.max(area || 0, 20)
    const floorMultiplier = 1 + Math.max(floors - 1, 0) * 0.08
    const subtotal =
      safeArea *
      finishCosts[finishLevel] *
      cityMultipliers[city] *
      projectMultipliers[projectType] *
      floorMultiplier
    const total = subtotal * (1 + contingency / 100)

    return {
      total,
      perM2: total / safeArea,
      structure: total * 0.32,
      material: total * 0.38,
      labor: total * 0.18,
      overhead: total * 0.12,
    }
  }, [area, city, contingency, finishLevel, floors, projectType])

  return (
    <section id="boq" ref={ref} className="bg-muted/30 py-16 sm:py-24">
      <div className={`mx-auto max-w-7xl px-4 transition-all duration-700 sm:px-6 lg:px-8 ${isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-3 gap-2">
              <Calculator className="h-3.5 w-3.5" />
              BOQ Lite
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{text.title}</h2>
            <p className="mt-3 text-muted-foreground">{text.subtitle}</p>
          </div>
          <Badge className="w-fit gap-2 bg-primary text-primary-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            {text.confidence}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-xl">{text.assumptions}</CardTitle>
              <CardDescription>{text.disclaimer}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{text.projectType}</Label>
                <Select value={projectType} onValueChange={(value) => setProjectType(value as ProjectType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">{text.residential}</SelectItem>
                    <SelectItem value="apartment">{text.apartment}</SelectItem>
                    <SelectItem value="commercial">{text.commercial}</SelectItem>
                    <SelectItem value="renovation">{text.renovation}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{text.city}</Label>
                <Select value={city} onValueChange={(value) => setCity(value as City)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addis_ababa">{text.addis_ababa}</SelectItem>
                    <SelectItem value="adama">{text.adama}</SelectItem>
                    <SelectItem value="hawassa">{text.hawassa}</SelectItem>
                    <SelectItem value="bahir_dar">{text.bahir_dar}</SelectItem>
                    <SelectItem value="mekelle">{text.mekelle}</SelectItem>
                    <SelectItem value="dire_dawa">{text.dire_dawa}</SelectItem>
                    <SelectItem value="outside_addis">{text.outside_addis}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="boq-area">{text.area} ({text.sqm})</Label>
                <Input
                  id="boq-area"
                  type="number"
                  min={20}
                  value={area}
                  onChange={(event) => setArea(Number(event.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="boq-floors">{text.floors}</Label>
                <Input
                  id="boq-floors"
                  type="number"
                  min={1}
                  max={10}
                  value={floors}
                  onChange={(event) => setFloors(Math.min(Math.max(Number(event.target.value), 1), 10))}
                />
              </div>

              <div className="space-y-2">
                <Label>{text.finish}</Label>
                <Select value={finishLevel} onValueChange={(value) => setFinishLevel(value as FinishLevel)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">{text.basic}</SelectItem>
                    <SelectItem value="standard">{text.standard}</SelectItem>
                    <SelectItem value="premium">{text.premium}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{text.contingency}</Label>
                  <span className="text-sm font-medium">{contingency}%</span>
                </div>
                <Slider
                  value={[contingency]}
                  min={0}
                  max={25}
                  step={1}
                  onValueChange={(value) => setContingency(value[0] ?? 0)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
                {text.estimate}
              </CardTitle>
              <CardDescription>
                {text[projectType]} - {text[city]} - {text[finishLevel]}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">{text.estimate}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{formatEtb(estimate.total)}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatEtb(estimate.perM2)} / {text.sqm}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  [text.structure, estimate.structure],
                  [text.material, estimate.material],
                  [text.labor, estimate.labor],
                  [text.overhead, estimate.overhead],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">{label as string}</p>
                    <p className="mt-1 text-sm font-semibold">{formatEtb(value as number)}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Button className="h-auto min-h-10 w-full justify-center gap-2 whitespace-normal px-3 py-2 text-center leading-tight" onClick={() => navigateTo("/#premium")}>
                  <FileText className="h-4 w-4" />
                  <span>{text.export}</span>
                </Button>
                <Button variant="outline" className="h-auto min-h-10 w-full justify-center gap-2 whitespace-normal px-3 py-2 text-center leading-tight" onClick={() => navigateTo("/#marketplace")}>
                  <Send className="h-4 w-4" />
                  <span>{text.rfq}</span>
                </Button>
                <Button variant="outline" className="h-auto min-h-10 w-full justify-center gap-2 whitespace-normal px-3 py-2 text-center leading-tight sm:col-span-2 xl:col-span-1" onClick={() => navigateTo("/#professionals")}>
                  <ShieldCheck className="h-4 w-4" />
                  <span>{text.review}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
