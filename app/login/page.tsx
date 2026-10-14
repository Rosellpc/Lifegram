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
      title="Qué bueno verte."
      subtitle="Inicia sesión para seguir compartiendo tus momentos."
      footerText="¿Aún no tienes cuenta?"
      footerHref="/register"
      footerLabel="Crear cuenta"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
          Correo electrónico
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
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            placeholder="Tu contraseña"
            className="rounded-lg border border-border bg-background px-4 py-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <Link href="/account" className="self-end text-xs text-foreground/65 underline underline-offset-4 hover:text-foreground">¿Olvidaste tu contraseña?</Link>

        {message && (
          <div role={message.type === "error" ? "alert" : "status"}
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
          className="auth-submit mt-2 flex min-h-12 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </AuthShell>
  );
}
