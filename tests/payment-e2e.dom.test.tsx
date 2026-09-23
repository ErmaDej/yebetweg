// @vitest-environment jsdom
//
// E2E: fresh signup → mocked Chapa checkout → /payment/success activates the
// subscription → user's role/tier reflects Premium.
//
// Strategy: the whole flow runs against mocked edge functions; the DB layer is
// an in-memory fake keyed like the real tables (users / premium_subscriptions /
// subscription_payments). supabase-js is mocked at the module boundary with a
// thenable query builder (same approach as tests/helpers/supabase-mock.ts, plus
// rpc() support and an auth signup stub).
//
// The `#payment/success` route needs no Supabase session by design (return page
// runs after Chapa redirects) — it only needs the reference and the edge call.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, waitFor, cleanup } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import React from "react"

// ---------------------------------------------------------------------------
// In-memory "database"
// ---------------------------------------------------------------------------
type Sub = {
  id: string
  user_id: string
  tier: string
  chapa_reference: string | null
  status: string
  is_active: boolean
  created_at: string
}
type UserRow = { id: string; email: string; role: string; full_name: string | null }
type Ledger = {
  user_id: string
  subscription_id: string
  amount: number
  method: string
  reference: string
  status: string
}

const db = {
  users: [] as UserRow[],
  subs: [] as Sub[],
  ledger: [] as Ledger[],
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  supabase: null as null | { auth: { signUp(a: { email: string }): Promise<{ data: { user: { id: string } } }> } },
}

function resetDb() {
  db.users = []
  db.subs = []
  db.ledger = []
  db.rpcCalls = []
}

const TEST_REF = "YBTEST-E2E-1"

// ---------------------------------------------------------------------------
// supabase mock
// ---------------------------------------------------------------------------
let __sb: Record<string, unknown>
vi.mock("@/lib/supabase", () => {
  type Builder = {
    eq: (..._a: unknown[]) => Builder
    order: (..._a: unknown[]) => Builder
    limit: (..._a: unknown[]) => Builder
    gte: (..._a: unknown[]) => Builder
    maybeSingle: () => Promise<{ data: unknown; error: null }>
    single: () => Promise<{ data: unknown; error: null }>
    then: (res: (v: { data: unknown[]; error: null }) => void) => void
  }
  const makeBuilder = (table: string): Builder => {
    const b: Record<string, unknown> = {}
    b.eq = () => makeBuilder(table)
    b.order = () => makeBuilder(table)
    b.limit = () => makeBuilder(table)
    b.gte = () => makeBuilder(table)
    b.maybeSingle = async () => ({ data: null, error: null })
    b.single = async () => ({ data: null, error: null })
    b.then = (res: (v: { data: unknown[]; error: null }) => void) => res({ data: [], error: null })
    return b as unknown as Builder
  }
  const supabase = {
      from: (table: string) => makeBuilder(table),
      rpc: async (fn: string, args: Record<string, unknown>) => {
        db.rpcCalls.push({ fn, args })
        // Mirror the real activate_subscription behavior against the fake db.
        if (fn === "activate_subscription") {
          const ref = args.p_reference as string
          const sub = db.subs.find((s) => s.chapa_reference === ref)
          if (sub) {
            sub.status = "active"
            sub.is_active = true
            const user = db.users.find((u) => u.id === sub.user_id)
            if (user && sub.tier === "premium") user.role = "premium"
            db.ledger.push({
              user_id: sub.user_id,
              subscription_id: sub.id,
              amount: 500,
              method: "chapa",
              reference: ref,
              status: "completed",
            })
            return { data: { success: true, tier: sub.tier }, error: null }
          }
          return { data: { success: false, error: "Subscription not found" }, error: null }
        }
        return { data: null, error: null }
      },
      auth: {
        signUp: async ({ email }: { email: string }) => {
          const id = `u-${db.users.length + 1}`
          db.users.push({ id, email, role: "user", full_name: null })
          return { data: { user: { id, email } } }
        },
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      channel: () => ({ on: () => ({ subscribe: () => ({ id: "ch" }) }), removeChannel: async () => {} }),
      removeChannel: async () => {},
  }
  __sb = supabase
  db.supabase = supabase as unknown as typeof db.supabase
  return { supabase }
})

// Edge-function mock: chapa-service "activate" verifies + activates.
const edgeCalls: { body: Record<string, unknown> }[] = []
vi.mock("@/lib/edge", () => ({
  EdgeError: class EdgeError extends Error {},
  callEdge: async (_fn: string, opts: { body?: Record<string, unknown> }) => {
    edgeCalls.push({ body: opts.body ?? {} })
    const ref = (opts.body?.tx_ref as string) ?? ""
    const sub = db.subs.find((s) => s.chapa_reference === ref)
    if (sub) {
      await (
        __sb as {
          rpc(f: string, a: Record<string, unknown>): Promise<unknown>
        }
      ).rpc("activate_subscription", { p_reference: ref, p_gateway: "chapa" })
      return { success: true }
    }
    return { success: false, error: "Payment not confirmed by Chapa" }
  },
}))

import { PaymentSuccessPage } from "@/pages/PaymentSuccessPage"

function renderAt(path: string, withQuery?: string) {
  // The page reads window.location.search directly (Chapa return URL), so
  // mirror the query into jsdom's address bar alongside the router entry.
  if (withQuery !== undefined) {
    window.history.replaceState({}, "", withQuery || "/")
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="*" element={<div data-testid="fallback" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("E2E: signup → Chapa payment → premium activation", () => {
  beforeEach(async () => {
    resetDb()
    edgeCalls.length = 0
    // Lazy-import the mocked module so its factory populates db.supabase
    // (static imports are hoisted above the factory's TDZ bindings).
    await import("@/lib/supabase")
  })
  afterEach(cleanup)

  it("upgrades a fresh signup to premium after a successful payment", async () => {
    // 1. Fresh signup (free user by default)
    const { data: signUp } = await db.supabase!.auth.signUp({ email: "newbuilder@example.com" })
    expect(db.users[0].role).toBe("user") // starts free

    // 2. Checkout created a pending subscription keyed to the payment reference
    db.subs.push({
      id: "sub-1",
      user_id: signUp!.user.id,
      tier: "premium",
      chapa_reference: TEST_REF,
      status: "pending",
      is_active: false,
      created_at: new Date().toISOString(),
    })

    // 3. Chapa redirects to /payment/success?reference=…
    renderAt(`/payment/success?reference=${TEST_REF}`, `?reference=${TEST_REF}`)

    // 4. Return page verifies with Chapa (edge) and activates
    await waitFor(
      () => {
        const done =
          screen.queryByText(/payment successful/i) ?? screen.queryByText(/payment failed/i)
        expect(done).toBeTruthy()
      },
      { timeout: 4000 },
    )
    screen.getByText(/payment successful/i)
    expect(edgeCalls).toHaveLength(1)
    expect(edgeCalls[0].body.action).toBe("activate")
    expect(edgeCalls[0].body.tx_ref).toBe(TEST_REF)
    expect(db.rpcCalls.some((c) => c.fn === "activate_subscription")).toBe(true)

    // 5. The upgrade is registered: role + subscription + ledger
    expect(db.users[0].role).toBe("premium")
    expect(db.subs[0].status).toBe("active")
    expect(db.subs[0].is_active).toBe(true)
    expect(db.ledger).toHaveLength(1)
    expect(db.ledger[0].amount).toBe(500)

    // 6. Dashboard CTA is shown
    const cta = screen.getByText(/go to dashboard/i) as HTMLAnchorElement
    expect(cta.getAttribute("href")).toBe("/dashboard")
  })

  it("does NOT upgrade when Chapa reports the payment unconfirmed", async () => {
    await db.supabase!.auth.signUp({ email: "nope@example.com" })
    // No pending sub for this reference → activation must fail
    renderAt("/payment/success?reference=YBUNKNOWN-REF", "?reference=YBUNKNOWN-REF")

    await waitFor(() => expect(screen.getByText(/payment failed/i)).toBeTruthy(), {
      timeout: 3000,
    })
    expect(db.users[0].role).toBe("user") // still free
    expect(db.ledger).toHaveLength(0)
  })

  it("shows a friendly error without a payment reference", async () => {
    renderAt("/payment/success", "")
    await waitFor(() => expect(screen.getByText(/payment reference not found/i)).toBeTruthy(), {
      timeout: 3000,
    })
  })
})
