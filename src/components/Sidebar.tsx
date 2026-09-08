"use client";

import { Brain, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type NavSection = {
  id: string;
  label: string;
  shape: string;
  icon: LucideIcon;
  accent: string;
};

/** Destaca no menu a seção que está mais próxima do topo da viewport. */
function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    const handler = () => {
      let current = ids[0] ?? "";
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= 180) current = id;
      }
      setActive(current);
    };

    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [ids]);

  return active;
}

type SidebarProps = {
  sections: NavSection[];
  prediction: { label: string; confidence: number };
};

export default function Sidebar({ sections, prediction }: SidebarProps) {
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const active = useActiveSection(ids);

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-slate-950/60 lg:block">
      <div className="sticky top-0 flex h-screen flex-col gap-6 overflow-y-auto p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30">
            <Brain size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">CNN por dentro</p>
            <p className="text-xs text-slate-500">Laboratório interativo</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const isActive = active === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                  isActive
                    ? "border-slate-700 bg-slate-800/70"
                    : "border-transparent hover:bg-slate-900"
                }`}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                  style={{
                    backgroundColor: isActive ? `${section.accent}22` : "rgb(30 41 59 / 0.6)",
                    color: isActive ? section.accent : "#64748b",
                  }}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${
                      isActive ? "text-slate-100" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  >
                    {index + 1}. {section.label}
                  </span>
                  <span className="block font-mono text-[10px] text-slate-600">
                    {section.shape}
                  </span>
                </span>
              </a>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Saída atual da rede
          </p>
          <p className="mt-1 text-sm font-semibold text-cyan-300">{prediction.label}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${prediction.confidence * 100}%` }}
            />
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-slate-500">
            {(prediction.confidence * 100).toFixed(1)}% de confiança
          </p>
        </div>
      </div>
    </aside>
  );
}
