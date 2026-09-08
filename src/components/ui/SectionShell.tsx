"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type SectionShellProps = {
  id: string;
  step: number;
  title: string;
  subtitle: string;
  accent: string;
  icon: LucideIcon;
  /** Coluna didática, à esquerda da visualização. */
  explanation: ReactNode;
  children: ReactNode;
};

export default function SectionShell({
  id,
  step,
  title,
  subtitle,
  accent,
  icon: Icon,
  explanation,
  children,
}: SectionShellProps) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-slate-800/80 pt-10 first:border-t-0 first:pt-0">
      <header className="mb-6 flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
          style={{
            borderColor: `${accent}55`,
            backgroundColor: `${accent}1a`,
            color: accent,
          }}
        >
          <Icon size={20} />
        </div>
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            Etapa {step}
          </p>
          <h2 className="text-2xl font-semibold text-slate-100">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{subtitle}</p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-sm leading-relaxed text-slate-300">
          {explanation}
        </aside>
        <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          {children}
        </div>
      </div>
    </section>
  );
}
