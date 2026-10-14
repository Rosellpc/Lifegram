"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import BrandLogo from "../../components/BrandLogo";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText: string;
  footerHref: string;
  footerLabel: string;
};

export default function AuthShell({
  title,
  subtitle,
  children,
  footerText,
  footerHref,
  footerLabel,
}: AuthShellProps) {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden glass-panel rounded-[28px] border border-border bg-card-bg md:grid-cols-[1fr_420px]">
          <section className="hidden bg-primary p-10 text-white md:flex md:flex-col md:justify-between">
            <div>
              <BrandLogo className="h-8 w-auto max-w-full text-foreground" />
              <h1 className="mt-5 max-w-sm text-4xl font-bold leading-tight">
                Comparte momentos, encuentra personas, crea comunidad.
              </h1>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square rounded-lg bg-white/15" />
              <div className="aspect-square rounded-lg bg-accent/70" />
              <div className="aspect-square rounded-lg bg-white/25" />
              <div className="aspect-square rounded-lg bg-accent/40" />
              <div className="aspect-square rounded-lg bg-white/20" />
              <div className="aspect-square rounded-lg bg-accent/80" />
            </div>
          </section>

          <section className="px-6 py-8 sm:px-10">
            <div className="mb-8 text-center">
              <Link
                href="/"
                className="inline-block text-foreground"
              >
                <BrandLogo className="h-9 w-auto max-w-full" />
              </Link>
              <h2 className="mt-8 text-2xl font-bold text-foreground">
                {title}
              </h2>
              <p className="mt-2 text-sm text-foreground/60">{subtitle}</p>
            </div>

            {children}

            <p className="mt-8 text-center text-sm text-foreground/60">
              {footerText}{" "}
              <Link href={footerHref} className="font-semibold text-primary">
                {footerLabel}
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
