import { useState } from "react"
import { Plus, ClipboardList, Trash2, Calendar, Users, DollarSign, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/lib/i18n"
import { useAuthContext } from "@/context/AuthContext"
import { useSiteLogs, type SiteLog } from "@/hooks/useSiteLogs"
import { useInView } from "@/hooks/useInView"

function SiteLogCard({ log, onDelete }: { log: SiteLog; onDelete: (id: string) => void }) {
  const { language } = useLanguage()
  const date = new Date(log.date).toLocaleDateString(language === "am" ? "am-ET" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <Card className="group border-border/50 hover:border-accent/50 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{log.project_name}</h4>
              <Badge variant="outline" className="text-[10px] shrink-0">
                <Calendar className="h-3 w-3 mr-1" />
                {date}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{log.work_completed}</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {log.labor_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {log.labor_count} {language === "en" ? "workers" : "ሰራተኞች"}
                </span>
              )}
              {log.payments > 0 && (
                <span className="inline-flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> {log.payments.toLocaleString()} ETB
                </span>
              )}
              {log.delay_reason && (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" /> {log.delay_reason}
                </span>
              )}
            </div>

            {log.materials_used && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                <span className="font-medium">{language === "en" ? "Materials:" : "ቁሳቁሶች:"}</span> {log.materials_used}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            onClick={() => onDelete(log.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const emptyLog: Omit<SiteLog, "id" | "created_at" | "updated_at" | "user_id"> = {
  project_name: "My Project",
  date: new Date().toISOString(),
  work_completed: "",
  labor_count: 0,
  materials_used: "",
  payments: 0,
  delay_reason: "",
  notes: "",
}

export function SiteLogSection() {
  const { language } = useLanguage()
  const { user } = useAuthContext()
  const { logs, loading, createLog, deleteLog } = useSiteLogs(user?.id)
  const { ref, isInView } = useInView()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyLog)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!form.work_completed.trim()) {
      setError(language === "en" ? "Please describe the work completed" : "እባክዎ የተሰራውን ስራ ይግለጹ")
      return
    }
    setSaving(true)
    setError("")

    const { error: err } = await createLog({
      ...form,
      user_id: user?.id || null,
      project_name: form.project_name || "My Project",
    })

    if (err) {
      setError(err.message)
    } else {
      setForm(emptyLog)
      setDialogOpen(false)
    }
    setSaving(false)
  }

  return (
    <section id="site-log" ref={ref} className="py-16 sm:py-24 bg-muted/30">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {language === "en" ? "Site Log" : "የግንባታ ምዝግብ"}
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              {language === "en"
                ? "Track daily construction progress, labor, materials, and payments"
                : "የዕለት ተዕለት የግንባታ እድገት፣ የሰራተኞች፣ የቁሳቁስ እና የክፍያ መከታተያ"}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" />
                {language === "en" ? "New Entry" : "አዲስ ግቤት"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {language === "en" ? "New Site Log Entry" : "አዲስ የግንባታ ምዝግብ"}
                </DialogTitle>
                <DialogDescription>
                  {language === "en" ? "Record daily construction progress" : "የዕለት ተዕለት የግንባታ እድገት ይመዝግቡ"}
                </DialogDescription>
              </DialogHeader>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{language === "en" ? "Project Name" : "የፕሮጀክት ስም"}</Label>
                  <Input
                    value={form.project_name}
                    onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                    placeholder={language === "en" ? "My Project" : "ፕሮጀክቴ"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{language === "en" ? "Date" : "ቀን"}</Label>
                  <Input
                    type="date"
                    value={form.date.slice(0, 10)}
                    onChange={(e) => setForm({ ...form, date: new Date(e.target.value).toISOString() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{language === "en" ? "Work Completed" : "የተሰራ ስራ"}</Label>
                  <Textarea
                    value={form.work_completed}
                    onChange={(e) => setForm({ ...form, work_completed: e.target.value })}
                    placeholder={language === "en" ? "Describe the work done today..." : "ዛሬ የተሰራውን ስራ ይግለጹ..."}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{language === "en" ? "Labor Count" : "የሰራተኞች ቁጥር"}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.labor_count || ""}
                      onChange={(e) => setForm({ ...form, labor_count: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{language === "en" ? "Payments (ETB)" : "ክፍያ (ETB)"}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.payments || ""}
                      onChange={(e) => setForm({ ...form, payments: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{language === "en" ? "Materials Used" : "የተጠቀሙ ቁሳቁሶች"}</Label>
                  <Input
                    value={form.materials_used}
                    onChange={(e) => setForm({ ...form, materials_used: e.target.value })}
                    placeholder={language === "en" ? "e.g. 50 bags cement, 2 tons sand" : "ለምሳሌ 50 ከረጢት ሲሚንቶ፣ 2 ቶን አሸዋ"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{language === "en" ? "Delay Reason (if any)" : "የመዘግየት ምክንያት (ካለ)"}</Label>
                  <Input
                    value={form.delay_reason}
                    onChange={(e) => setForm({ ...form, delay_reason: e.target.value })}
                    placeholder={language === "en" ? "e.g. Material shortage, rain" : "ለምሳሌ የቁሳቁስ እጥረት፣ ዝናብ"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{language === "en" ? "Notes" : "ማስታወሻ"}</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <Button onClick={handleSubmit} disabled={saving} className="w-full">
                  {saving
                    ? (language === "en" ? "Saving..." : "በማስቀመጥ ላይ...")
                    : (language === "en" ? "Save Entry" : "ግቤት አስቀምጥ")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!user ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {language === "en" ? "Sign in to track your project" : "ፕሮጀክትዎን ለመከታተል ይግቡ"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "en"
                  ? "Create an account to start logging your construction progress"
                  : "የግንባታ እድገትዎን መመዝገብ ለመጀመር አካውንት ይፍጠሩ"}
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {language === "en" ? "No entries yet" : "ገና ምንም ግቤቶች የሉም"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "en"
                  ? "Start tracking your construction progress by adding your first entry"
                  : "የመጀመሪያ ግቤትዎን በማከል የግንባታ እድገትዎን መከታተል ይጀምሩ"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <SiteLogCard key={log.id} log={log} onDelete={deleteLog} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
