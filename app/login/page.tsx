"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "../auth/components/AuthShell";
import { supabase } from "../utils/client";
import { getErrorMessage } from "../utils/errors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setMessage({ type: "success", text: "Sesion iniciada correctamente." });
    router.push("/");
    router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error,"No se pudo iniciar sesión. Inténtalo de nuevo.") });
    } finally { setIsLoading(false); }
  };

  return (
    <AuthShell
      title="Inicia sesion"
      subtitle="Vuelve a tu feed, tus fotos y tus personas favoritas."
      footerText="No tienes cuenta?"
      footerHref="/register"
      footerLabel="Registrate"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Link href="/account" className="text-sm text-primary underline">¿Olvidaste tu contraseña o necesitas confirmar tu correo?</Link>
        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder="tu@email.com"
            className="rounded-lg border border-border bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          Contrasena
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            placeholder="Tu contrasena"
            className="rounded-lg border border-border bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        {message && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-green-500/20 bg-green-500/10 text-green-600"
                : "border-red-500/20 bg-red-500/10 text-red-600"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </AuthShell>
  );
}
