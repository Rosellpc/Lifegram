"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/client";
import { getErrorMessage } from "../utils/errors";
import { withTimeout } from "../utils/async";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    const callbackError = url.searchParams.get("error_description") || fragment.get("error_description");
    if (callbackError) {
      const timer = setTimeout(()=>setMessage("El enlace no es válido o ha caducado. Solicita uno nuevo."),0);
      return ()=>clearTimeout(timer);
    }
    if (!url.searchParams.get("code") && !fragment.get("type")) return;
    let active = true;
    const complete = async () => {
      const code = url.searchParams.get("code");
      const result = code ? await withTimeout(supabase.auth.exchangeCodeForSession(code)) : await withTimeout(supabase.auth.getSession());
      if (result.error || !result.data.session) throw result.error ?? new Error("El enlace ha caducado. Solicita otro.");
      if (active) {
        setMessage(fragment.get("type") === "recovery" ? "Enlace validado. Introduce tu nueva contraseña." : "Correo confirmado. Puedes entrar a tu perfil.");
        window.history.replaceState({}, "", "/account");
      }
    };
    complete().catch(error=>{if(active)setMessage(getErrorMessage(error,"No se pudo validar el enlace."));});
    return ()=>{active=false;};
  }, []);
  const run = async (action: "reset" | "resend" | "password" | "email") => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if ((action === "reset" || action === "resend" || action === "email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error("Introduce un correo válido.");
      if (action === "password" && (password.length < 8 || password !== confirmation)) throw new Error("Las contraseñas deben coincidir y tener al menos 8 caracteres.");
      const redirect = `${window.location.origin}/account`;
      const result = action === "reset"
        ? await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect })
        : action === "resend"
          ? await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: redirect } })
          : await supabase.auth.updateUser(action === "password" ? { password } : { email: email.trim() }, { emailRedirectTo: redirect });
      if (result.error) throw result.error;
      setMessage(action === "password" ? "Contraseña actualizada." : "Solicitud enviada. Revisa tu correo y sigue el enlace si corresponde.");
      setPassword(""); setConfirmation("");
    } catch (error) { setMessage(getErrorMessage(error, "No se pudo completar. Puedes reintentar.")); }
    finally { setBusy(false); }
  };
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-8">
      <h1 className="text-2xl font-bold">Tu cuenta</h1>
      <p>Recupera el acceso, confirma tu correo o actualiza los datos de tu cuenta. Para cambiar el correo o la contraseña necesitas una sesión activa o un enlace de recuperación válido.</p>
      <label className="grid gap-2">Correo electrónico<input className="rounded border border-border bg-card-bg p-3" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} onClick={() => run("reset")} className="rounded border p-3">Recuperar contraseña</button>
        <button disabled={busy} onClick={() => run("resend")} className="rounded border p-3">Reenviar confirmación</button>
        <button disabled={busy} onClick={() => run("email")} className="rounded border p-3">Cambiar correo</button>
      </div>
      <label className="grid gap-2">Nueva contraseña<input className="rounded border border-border bg-card-bg p-3" type="password" autoComplete="new-password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label className="grid gap-2">Repite la contraseña<input className="rounded border border-border bg-card-bg p-3" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
      <button disabled={busy} onClick={() => run("password")} className="rounded bg-primary p-3 text-white">{busy ? "Procesando..." : "Guardar contraseña"}</button>
      {message && <p role="status" aria-live="polite">{message}</p>}
      <Link href="/login" className="underline">Ir al inicio de sesión</Link>
      <Link href="/profile" className="underline">Volver al perfil</Link>
    </main>
  );
}
