"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/client";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let authChanged = false;

    const updateSession = (hasSession: boolean) => {
      if (!active) return;
      setReady(hasSession);
      if (!hasSession) router.replace("/login");
    };

    const ensureSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      // A newer auth event takes precedence over the initial session lookup.
      if (!authChanged) updateSession(!error && Boolean(data.session));
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      updateSession(Boolean(session));
    });

    ensureSession().catch(() => {
      if (!authChanged) updateSession(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-foreground/60">
        Cargando tu sesion...
      </div>
    );
  }

  return <>{children}</>;
}
