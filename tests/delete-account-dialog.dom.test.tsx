// @vitest-environment jsdom
// DeleteAccountDialog (DOM) — the two-step deletion confirmation flow:
//   step 1 (what happens) → Continue → step 2 (type DELETE) → RPC → sign out.
// Uses the shared supabase-mock for the delete_own_account RPC and the
// AuthContext.Provider wrapping pattern from protected-route.dom.test.tsx.
// The component is imported dynamically so the vi.doMock registration in
// mockSupabaseModule is picked up.
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"
import { afterEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { LanguageProvider } from "@/lib/i18n"
import { mockSupabaseModule } from "./helpers/supabase-mock"

async function setup(rpcResult: { data?: unknown; error?: { message: string } | null }) {
  const rpc = vi.fn(async () => rpcResult)
  const signOut = vi.fn(async () => {})
  const onOpenChange = vi.fn()
  // Mock AuthContext by module path: vi.resetModules() + the dynamic import
  // below re-evaluates @/context/AuthContext, so a static import's Provider
  // would be a *different* React context than the component's — the default
  // no-op signOut would win. Mocking the module keeps one shared instance.
  vi.doMock("@/context/AuthContext", () => ({
    AuthContext: { Provider: (p: { children: React.ReactNode }) => p.children, useAuthContext: () => authValue({ signOut }) },
    useAuthContext: () => authValue({ signOut }),
  }))
  mockSupabaseModule({ rpc } as never)
  const { DeleteAccountDialog } = await import("@/components/profile/DeleteAccountDialog")
  const utils = render(
    <MemoryRouter>
      <LanguageProvider>
        <DeleteAccountDialog open onOpenChange={onOpenChange} />
      </LanguageProvider>
    </MemoryRouter>
  )
  return { rpc, signOut, onOpenChange, ...utils }
}

/** Standalone auth value builder (used by the module-path AuthContext mock). */
function authValue(overrides = {}) {
  return {
    user: { id: "auth-1", email: "a@b.com" } as never,
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
  }
}

function goToStep2() {
  fireEvent.click(screen.getByText("Continue"))
  expect(screen.getByText("Type DELETE to confirm")).toBeTruthy()
}

beforeEach(() => {
  vi.resetModules()
  localStorage.removeItem("yebetweg-lang")
})

afterEach(cleanup)

describe("DeleteAccountDialog (DOM)", () => {
  it("step 1 warns about irreversible deletion and anonymization, Continue arms step 2", async () => {
    await setup({ data: { success: true } })
    expect(screen.getByText("Delete your account?")).toBeTruthy()
    // Key warnings from the RPC design are visible before continuing.
    expect(screen.getByText(/cannot be undone/i)).toBeTruthy()
    expect(screen.getByText(/anonymized/i)).toBeTruthy()
    expect(screen.getByText(/Admin accounts cannot self-delete/i)).toBeTruthy()
    // The confirm word input is not present until step 2.
    expect(screen.queryByPlaceholderText("DELETE")).toBeNull()
    goToStep2()
    expect(screen.getByPlaceholderText("DELETE")).toBeTruthy()
  })

  it("the Delete button stays disabled until DELETE is typed (case-insensitive)", async () => {
    await setup({ data: { success: true } })
    goToStep2()
    const input = screen.getByPlaceholderText("DELETE") as HTMLInputElement
    const button = screen.getByText("Delete my account") as HTMLButtonElement

    expect(button.disabled).toBe(true)
    fireEvent.change(input, { target: { value: "REMOVE" } })
    expect(button.disabled).toBe(true)
    fireEvent.change(input, { target: { value: "  delete  " } })
    expect(button.disabled).toBe(false)
  })

  it("RPC failure shows the server error and does not sign out or close", async () => {
    const { signOut, onOpenChange } = await setup({
      data: { success: false, error: "Admin accounts cannot self-delete." },
    })
    goToStep2()
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } })
    fireEvent.click(screen.getByText("Delete my account"))

    await waitFor(() => expect(screen.getByText("Admin accounts cannot self-delete.")).toBeTruthy())
    expect(signOut).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it("success calls signOut and closes the dialog", async () => {
    const { rpc, signOut, onOpenChange } = await setup({ data: { success: true } })
    goToStep2()
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } })
    fireEvent.click(screen.getByText("Delete my account"))

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(rpc).toHaveBeenCalledWith("delete_own_account")
  })

  it("transport errors (network/exception) surface as a failure message", async () => {
    const { signOut } = await setup({ error: { message: "Network request failed" } })
    goToStep2()
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } })
    fireEvent.click(screen.getByText("Delete my account"))

    await waitFor(() => expect(screen.getByText("Network request failed")).toBeTruthy())
    expect(signOut).not.toHaveBeenCalled()
  })

  it("Back returns to step 1 without running the RPC", async () => {
    const { rpc } = await setup({ data: { success: true } })
    goToStep2()
    fireEvent.click(screen.getByText("Back"))
    expect(screen.getByText("Delete your account?")).toBeTruthy()
    expect(rpc).not.toHaveBeenCalled()
  })
})
