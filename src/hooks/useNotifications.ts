import { useEffect, useId, useMemo, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { useAuthContext } from "@/context/AuthContext"

export type AppNotification = {
  id: string
  user_id: string
  type: "info" | "stale_prices" | "price_submission" | "rfq" | "listing" | "system"
  title: string
  body: string | null
  link: string | null
  meta: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

const PAGE_SIZE = 15
const QUERY_KEY = ["notifications"] as const

async function fetchNotifications(isAdmin: boolean): Promise<AppNotification[]> {
  // Admins (users.role='admin') see all notifications (notif_select_admin policy);
  // everyone else sees their own (notif_select_own). The server enforces this
  // via RLS — the client simply asks for the union of both scopes, most
  // recent first, capped at one page for the bell dropdown.
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE)

  if (!isAdmin) {
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_uid", (await supabase.auth.getSession()).data.session?.user.id ?? "")
      .maybeSingle()
    if (!profile) return []
    query = query.eq("user_id", (profile as { id: string }).id)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as AppNotification[]
}

export function useNotifications(isAdmin = false) {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const enabled = Boolean(user)
  // Unique channel per hook instance: multiple consumers (navbar bell +
  // notifications page) each get their own subscription — reusing one name
  // makes the second postgres_changes registration land after the first
  // subscribe(), which throws.
  const channelName = `notifications-${useId()}`

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, { isAdmin }],
    queryFn: () => fetchNotifications(isAdmin),
    enabled,
    staleTime: 30_000,
  })

  // Realtime: new notification rows appear instantly (Supabase Realtime
  // broadcasts INSERTs on the supabase_realtime publication).
  useEffect(() => {
    if (!enabled) return
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        },
      )
      .subscribe()
    channelRef.current = channel
    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [enabled, queryClient, channelName])

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return 0
      const { data, error } = await supabase.rpc("mark_notifications_read", { p_ids: ids })
      if (error) throw new Error(error.message)
      return (data as number) ?? 0
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  const notifications = data ?? []
  const unread = useMemo(
    () => notifications.filter((n) => n.read_at === null),
    [notifications],
  )

  return {
    notifications,
    unread,
    unreadCount: unread.length,
    isLoading,
    error,
    refetch,
    markRead: (ids: string[]) => markRead.mutate(ids),
    markAllRead: () => markRead.mutate(unread.map((n) => n.id)),
    isMarkingRead: markRead.isPending,
  }
}
