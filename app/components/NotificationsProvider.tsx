"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../utils/client";
import { withTimeout } from "../utils/async";

const Context = createContext({ userId: null as string | null, unread: 0, revision: 0, refresh: () => {} });
export const useNotifications = () => useContext(Context);

export default function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [countState, setCountState] = useState({ userId: null as string | null, count: 0 });
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision(value => value + 1);

  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedEvent = true;
      if (active) setUserId(session?.user.id ?? null);
    });
    withTimeout(supabase.auth.getSession()).then(({ data }) => {
      if (active && !receivedEvent) setUserId(data.session?.user.id ?? null);
    }).catch(() => {});
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` }, refresh)
      .subscribe(status => { if (status === "SUBSCRIBED") refresh(); });
    const poll = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(poll); window.removeEventListener("focus", onFocus); void supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (userId) {
      supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("recipient_id", userId).eq("is_read", false).then(({ count, error }) => {
          if (active && !error) setCountState({ userId, count: count ?? 0 });
        });
    }
    return () => { active = false; };
  }, [userId, revision]);

  return <Context.Provider value={{ userId, unread: userId && countState.userId === userId ? countState.count : 0, revision, refresh }}>{children}</Context.Provider>;
}
