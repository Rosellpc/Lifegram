"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/client";
import { withTimeout } from "../utils/async";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let authChanged = false;

    const updateSession = (hasSession: boolean) => {
      if (!active) return;
      setReady(hasSession);
      if (hasSession) setFailed(false);
      // Leave Supabase's auth callback before navigation mounts more auth consumers.
      if (!hasSession) setTimeout(() => {
        if (active) router.replace("/login");
      }, 0);
    };

    const ensureSession = async () => {
      const { data, error } = await withTimeout(supabase.auth.getSession());
      // A newer auth event takes precedence over the initial session lookup.
      if (!authChanged) updateSession(!error && Boolean(data.session));
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      updateSession(Boolean(session));
    });

    ensureSession().catch(() => {
      if (!authChanged && active) setFailed(true);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [router, retry]);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-foreground/60">
        {failed ? <div role="alert">
          <p>No se pudo cargar tu sesión.</p>
          <button type="button" onClick={() => { setFailed(false); setRetry(value => value + 1); }} className="mt-3 underline">Reintentar</button>
          <a href="/login" className="ml-4 underline">Ir al login</a>
        </div> : "Cargando tu sesión..."}
      </div>
    );
  }

  return <>{children}</>;
}
