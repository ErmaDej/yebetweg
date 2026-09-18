// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { afterEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { LanguageProvider } from "@/lib/i18n"
import { SearchBar } from "@/components/SearchBar"

function renderSearchBar(props = {}) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <SearchBar {...props} />
      </LanguageProvider>
    </MemoryRouter>
  )
}

describe("SearchBar (DOM)", () => {
  afterEach(cleanup)

  beforeEach(() => {
    localStorage.removeItem("yebetweg-lang")
  })

  it("renders a collapsed search button initially", () => {
    renderSearchBar()
    expect(screen.getByTitle("Search")).toBeTruthy()
  })

  it("opens an input and collapses after submit", () => {
    renderSearchBar()
    fireEvent.click(screen.getByTitle("Search"))
    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement
    fireEvent.change(input, { target: { value: "cement" } })
    expect(input.value).toBe("cement")
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 })
    // Submit collapses the bar back to the launcher button.
    expect(screen.queryByPlaceholderText("Search...")).toBeNull()
    expect(screen.getByTitle("Search")).toBeTruthy()
  })

  it("does not submit empty queries", () => {
    let received: string | null = null
    renderSearchBar({ onSearch: (q) => (received = q) })
    fireEvent.click(screen.getByTitle("Search"))
    const input = screen.getByPlaceholderText("Search...")
    fireEvent.change(input, { target: { value: "   " } })
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 })
    expect(received).toBeNull()
  })

  it("calls onSearch callback when provided", () => {
    const received: string[] = []
    renderSearchBar({ onSearch: (q) => received.push(q) })
    fireEvent.click(screen.getByTitle("Search"))
    const input = screen.getByPlaceholderText("Search...")
    fireEvent.change(input, { target: { value: "rebar" } })
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 })
    expect(received).toEqual(["rebar"])
  })

  it("shows the Amharic placeholder when language is am", () => {
    localStorage.setItem("yebetweg-lang", "am")
    renderSearchBar()
    fireEvent.click(screen.getByTitle("ይፈልጉ"))
    expect(screen.getByPlaceholderText("ይፈልጉ...")).toBeTruthy()
  })
})
