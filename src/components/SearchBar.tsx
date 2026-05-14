import { useState } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/lib/i18n"
import { navigateTo } from "@/lib/navigation"

interface SearchBarProps {
  onSearch?: (query: string) => void
  mobile?: boolean
}

export function SearchBar({ onSearch, mobile = false }: SearchBarProps) {
  const { language } = useLanguage()
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  const handleSearch = () => {
    if (query.trim()) {
      if (onSearch) {
        onSearch(query)
      } else {
        navigateTo(`/search?q=${encodeURIComponent(query)}`)
      }
      setQuery("")
      setIsOpen(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  if (mobile) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder={language === "en" ? "Search..." : "ይፈልጉ..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button size="sm" onClick={handleSearch} disabled={!query.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {isOpen ? (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder={language === "en" ? "Search..." : "ይፈልጉ..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-48"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsOpen(false)
              setQuery("")
            }}
            className="px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsOpen(true)}
          className="px-2"
          title={language === "en" ? "Search" : "ይፈልጉ"}
        >
          <Search className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
