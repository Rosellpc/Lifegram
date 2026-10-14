"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/client";
import RequireAuth from "../components/RequireAuth";
import ProfileScreen from "../components/ProfileScreen";
import { getErrorMessage } from "../utils/errors";
import { withTimeout } from "../utils/async";

export default function MyProfilePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      const { error } = await withTimeout(supabase.auth.signOut({ scope: "local" }));
      if (error) throw error;
      window.location.replace("/login");
    } catch (error) {
      setSignOutError(getErrorMessage(error, "No se pudo cerrar la sesión. Inténtalo de nuevo."));
      setSigningOut(false);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await withTimeout(supabase.auth.getSession());
      if (active) {
        setProfileId(data.session?.user.id ?? null);
      }
    };

    load().catch((error) => {
      if (active) setSignOutError(getErrorMessage(error, "No se pudo cargar la sesión."));
    });

    return () => {
      active = false;
    };
  }, []);

  return (
        <div className="min-h-screen px-4 py-6 pb-28">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex justify-end">
              <Link href="/account" className="mr-4 rounded-lg border border-border px-4 py-2 text-sm">Gestionar cuenta</Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="rounded-lg border border-border bg-card-bg px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </button>
            </div>
            {signOutError && (
              <p role="alert" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {signOutError}
              </p>
            )}
            <RequireAuth>
              {profileId ? <ProfileScreen profileId={profileId} /> : (
                <p className="text-sm text-foreground/60">Cargando perfil...</p>
              )}
            </RequireAuth>
          </div>
        </div>
  );
}
