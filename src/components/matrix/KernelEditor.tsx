"use client";

import { Sliders } from "lucide-react";
import type { Matrix } from "@/lib/cnn";
import { kernelColor, PALETTE } from "@/lib/colors";
import { KERNEL_PRESETS, matchPreset } from "@/lib/kernels";

type KernelEditorProps = {
  weights: Matrix;
  onChange: (weights: Matrix) => void;
  onSelectPreset: (id: string) => void;
  compact?: boolean;
};

function roundForInput(value: number): number {
  return Math.round(value * 100) / 100;
}

export default function KernelEditor({
  weights,
  onChange,
  onSelectPreset,
  compact = false,
}: KernelEditorProps) {
  const preset = matchPreset(weights);
  const scale = Math.max(...weights.flat().map(Math.abs), 1);
  const sum = weights.flat().reduce((a, b) => a + b, 0);

  const updateCell = (row: number, col: number, raw: string) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    const next = weights.map((r) => [...r]);
    next[row][col] = parsed;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {KERNEL_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectPreset(item.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              preset?.id === item.id
                ? "border-orange-400/60 bg-orange-400/15 text-orange-200"
                : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className={`flex ${compact ? "flex-col" : "flex-wrap"} items-start gap-5`}>
        <div>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(3, 56px)" }}
          >
            {weights.map((row, r) =>
              row.map((value, c) => (
                <input
                  key={`${r}-${c}`}
                  type="number"
                  step={0.5}
                  value={roundForInput(value)}
                  onChange={(e) => updateCell(r, c, e.target.value)}
                  className="h-14 w-14 rounded-md border border-slate-700/80 text-center font-mono text-sm outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-400/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  style={kernelColor(value, scale)}
                  aria-label={`Peso do kernel linha ${r + 1} coluna ${c + 1}`}
                />
              ))
            )}
          </div>
          <p className="mt-2 flex items-center gap-1.5 font-mono text-xs text-slate-500">
            <Sliders size={12} />
            soma dos pesos = <span className="text-slate-300">{roundForInput(sum)}</span>
          </p>
        </div>

        <div className="min-w-[180px] flex-1 space-y-2">
          <p className="text-sm font-medium" style={{ color: PALETTE.kernel }}>
            {preset ? preset.name : "Kernel personalizado"}
          </p>
          <p className="text-xs leading-relaxed text-slate-400">
            {preset
              ? preset.description
              : "Você editou os pesos manualmente. Experimente: soma zero tende a detectar bordas, soma um preserva o brilho médio da imagem."}
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            {Math.abs(sum) < 1e-6
              ? "Soma zero: áreas de intensidade uniforme resultam em 0. Só sobram as transições."
              : "Soma diferente de zero: regiões uniformes também geram resposta, deslocando o brilho da saída."}
          </p>
        </div>
      </div>
    </div>
  );
}
