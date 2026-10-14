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

export default function AuthShell({ title, subtitle, children, footerText, footerHref, footerLabel }: AuthShellProps) {
  return <main className="auth-scene relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
    <div className="auth-orb auth-orb-one" aria-hidden="true" />
    <div className="auth-orb auth-orb-two" aria-hidden="true" />
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="auth-surface grid overflow-hidden rounded-[32px] md:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/60 p-10 md:flex lg:p-14">
          <Link href="/" className="relative z-10 self-start text-foreground"><BrandLogo className="h-7 w-auto" /></Link>
          <div className="auth-sculpture my-12" aria-hidden="true">
            <span /><span /><span />
          </div>
          <div className="relative z-10">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[.28em] text-foreground/55">Momentos que conectan</p>
            <p className="max-w-xs text-4xl font-light leading-[1.15] tracking-[-.045em] lg:text-5xl">La vida se disfruta<br /><span className="text-foreground/55">compartida.</span></p>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-foreground/60">Un espacio para tus historias y las personas que las hacen especiales.</p>
          </div>
        </section>
        <section className="px-6 py-10 sm:px-10 md:py-14 lg:px-14">
          <Link href="/" className="mb-10 inline-block text-foreground md:hidden"><BrandLogo className="h-7 w-auto" /></Link>
          <div className="mb-8">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.24em] text-foreground/50">Tu espacio, tus personas</p>
            <h1 className="text-3xl font-medium text-foreground">{title}</h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground/60">{subtitle}</p>
          </div>
          {children}
          <p className="mt-8 border-t border-foreground/10 pt-6 text-center text-sm text-foreground/60">
            {footerText}{" "}<Link href={footerHref} className="font-semibold text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">{footerLabel}</Link>
          </p>
        </section>
      </div>
      <p className="mt-6 text-center text-[10px] uppercase tracking-[.24em] text-foreground/45">Lifegram · Tus momentos, tu comunidad</p>
    </div>
  </main>;
}
