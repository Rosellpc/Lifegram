"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import RequireAuth from "../components/RequireAuth";
import { useNotifications } from "../components/NotificationsProvider";
import { supabase } from "../utils/client";
import { getErrorMessage } from "../utils/errors";
import { defaultAvatar } from "../utils/assets";
import { fetchNotifications, type NotificationRow } from "../utils/social";

function label(type: string) {
  return type === "like" ? "indicó que le gusta tu publicación." :
    type === "comment" ? "comentó tu publicación." :
    type === "follow" ? "empezó a seguirte." : "interactuó contigo.";
}

export default function NotificationsPage() {
  const { userId, unread, revision, refresh } = useNotifications();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    const version = ++generation.current;
    if (!userId) return;
    fetchNotifications(supabase, userId, { unreadOnly }).then(data => {
      if (generation.current !== version) return;
      setRows(data); setHasMore(data.length === 30); setError(null); setLoading(false);
    }).catch(cause => {
      if (generation.current !== version) return;
      setError(getErrorMessage(cause, "No se pudieron cargar las notificaciones.")); setLoading(false);
    });
    return () => { generation.current = version + 1; };
  }, [userId, unreadOnly, revision, retry]);

  async function loadMore() {
    if (!userId || !rows.length || loadingMore) return;
    const version = generation.current;
    setLoadingMore(true);
    try {
      const data = await fetchNotifications(supabase, userId, { unreadOnly, before: rows[rows.length - 1] });
      if (version !== generation.current) return;
      setRows(current => [...current, ...data.filter(row => !current.some(item => item.id === row.id))]);
      setHasMore(data.length === 30); setError(null);
    } catch (cause) {
      if (version === generation.current) setError(getErrorMessage(cause, "No se pudieron cargar más notificaciones."));
    } finally { setLoadingMore(false); }
  }

  async function markRead(id?: string) {
    if (!userId || busy) return;
    setBusy(id ?? "all");
    try {
      let query = supabase.from("notifications").update({ is_read: true }).eq("recipient_id", userId).eq("is_read", false);
      if (id) query = query.eq("id", id);
      const { error } = await query;
      if (error) throw error;
      setRows(current => current.map(row => !id || row.id === id ? { ...row, is_read: true } : row));
      setError(null); refresh();
    } catch (cause) { setError(getErrorMessage(cause, "No se pudo marcar como leído. Inténtalo de nuevo.")); }
    finally { setBusy(null); }
  }

  const visibleRows = unreadOnly ? rows.filter(row => !row.is_read) : rows;
  return <RequireAuth><div className="min-h-screen">
    <header className="glass-header sticky top-0 z-40 border-b">
      <div className="mx-auto max-w-2xl px-4 py-4"><h1 className="text-xl font-bold">Notificaciones</h1></div>
    </header>
    <main className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Filtrar notificaciones">
          <button aria-pressed={!unreadOnly} onClick={() => { if (unreadOnly) { setUnreadOnly(false); setLoading(true); } }} className="rounded-full border border-border px-4 py-2 text-sm aria-pressed:bg-primary aria-pressed:text-white">Todas</button>
          <button aria-pressed={unreadOnly} onClick={() => { if (!unreadOnly) { setUnreadOnly(true); setLoading(true); } }} className="rounded-full border border-border px-4 py-2 text-sm aria-pressed:bg-primary aria-pressed:text-white">Sin leer ({unread})</button>
        </div>
        <button disabled={!!busy || !unread} onClick={() => void markRead()} className="text-sm font-semibold text-primary disabled:opacity-40">{busy === "all" ? "Guardando…" : "Marcar todas como leídas"}</button>
      </div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 p-4 text-sm text-red-600">{error}<button onClick={() => { setLoading(true); setRetry(value => value + 1); }} className="ml-3 underline">Reintentar</button></div>}
      {loading ? <p role="status" className="text-sm text-foreground/60">Cargando notificaciones…</p> :
        visibleRows.length ? <ul className="space-y-3">{visibleRows.map(row => {
          const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
          const href = row.post_id ? "/posts/" + row.post_id : row.actor_id ? "/profile/" + row.actor_id : null;
          return <li key={row.id} className={"glass-card flex items-start gap-3 rounded-2xl border p-4 " + (row.is_read ? "border-border" : "border-primary/30 bg-primary/5")}>
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
              <Image src={actor?.avatar_url || defaultAvatar} alt="" fill sizes="44px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{row.actor_id ? <Link href={"/profile/" + row.actor_id} className="font-semibold hover:underline">{actor?.username || "Usuario"}</Link> : <strong>Usuario</strong>}{" "}{label(row.type)}</p>
              <time dateTime={row.created_at} className="mt-1 block text-xs text-foreground/60">{new Date(row.created_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}</time>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-primary">
                {href && <Link href={href} onClick={() => { if (!row.is_read) void markRead(row.id); }}>{row.post_id ? "Ver publicación" : "Ver perfil"}</Link>}
                {!row.is_read && <button disabled={!!busy} onClick={() => void markRead(row.id)}>{busy === row.id ? "Guardando…" : "Marcar como leída"}</button>}
              </div>
            </div>
            {!row.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-primary" aria-label="Sin leer" />}
          </li>;
        })}</ul> : <div className="glass-card rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-semibold">{unreadOnly ? "Estás al día" : "Tu comunidad empieza aquí"}</p>
          <p className="mt-2 text-sm text-foreground/60">{unreadOnly ? "No tienes notificaciones sin leer." : "Aquí verás los nuevos seguidores, likes y comentarios."}</p>
          {!unreadOnly && <Link href="/search" className="mt-4 inline-block text-sm font-semibold text-primary">Descubrir personas</Link>}
        </div>}
      {!loading && hasMore && <button disabled={loadingMore} onClick={() => void loadMore()} className="mt-5 w-full rounded-xl border border-border p-3 text-sm font-semibold">{loadingMore ? "Cargando…" : "Cargar más"}</button>}
    </main>
  </div></RequireAuth>;
}
