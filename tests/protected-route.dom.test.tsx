// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { afterEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { LanguageProvider } from "@/lib/i18n"
import { AuthContext } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"

const authValue = (overrides = {}) => ({
  user: null,
  session: null,
  loading: false,
  error: null,
  signInWithPassword: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  resetPassword: async () => ({}),
  updatePassword: async () => ({}),
  clearError: () => {},
  ...overrides,
})

function renderProtected(
  ui: React.ReactNode,
  overrides = {},
  routeProps: { fallback?: React.ReactNode; showAuthPrompt?: boolean } = {}
) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue(overrides) as never}>
        <LanguageProvider>
          <ProtectedRoute {...routeProps}>{ui}</ProtectedRoute>
        </LanguageProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe("ProtectedRoute (DOM)", () => {
  afterEach(cleanup)

  it("shows a loading spinner while auth resolves", () => {
    renderProtected(<div>SECRET</div>, { loading: true })
    expect(screen.queryByText("SECRET")).toBeNull()
    expect(document.querySelector(".animate-spin")).toBeTruthy()
  })

  it("shows the sign-in prompt for anonymous users and hides content", () => {
    renderProtected(<div>SECRET</div>, { user: null, loading: false })
    expect(screen.queryByText("SECRET")).toBeNull()
    expect(screen.getByText("Sign In Required")).toBeTruthy()
  })

  it("renders children when a user is signed in", () => {
    renderProtected(<div>SECRET</div>, {
      user: { id: "u1", email: "a@b.com" } as never,
      loading: false,
    })
    expect(screen.getByText("SECRET")).toBeTruthy()
    expect(screen.queryByText("Sign In Required")).toBeNull()
  })

  it("renders custom fallback while loading", () => {
    renderProtected(<div>SECRET</div>, { loading: true }, { fallback: <div>custom loader</div> })
    expect(screen.getByText("custom loader")).toBeTruthy()
  })
})
