"use client";

import { Eraser, Paintbrush, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import MatrixGrid from "@/components/matrix/MatrixGrid";
import Legend from "@/components/ui/Legend";
import type { Matrix } from "@/lib/cnn";
import { formatIntensity, inputColor, PALETTE, type ValueScale } from "@/lib/colors";
import { PATTERN_PRESETS } from "@/lib/patterns";

type InputLayerProps = {
  matrix: Matrix;
  patternId: string | null;
  onSelectPattern: (id: string) => void;
  onPaint: (row: number, col: number, value: number) => void;
  onClear: () => void;
  valueScale: ValueScale;
  onToggleScale: () => void;
};

const BRUSH_LEVELS = [0.25, 0.5, 0.75, 1];

export default function InputLayer({
  matrix,
  patternId,
  onSelectPattern,
  onPaint,
  onClear,
  valueScale,
  onToggleScale,
}: InputLayerProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [brush, setBrush] = useState(1);
  const [isErasing, setIsErasing] = useState(false);

  // O ponteiro pode ser solto fora do grid; ouvimos no window para não "grudar".
  useEffect(() => {
    const stop = () => setIsDrawing(false);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const paint = (row: number, col: number) => {
    onPaint(row, col, isErasing ? 0 : brush);
  };

  const litPixels = matrix.flat().filter((v) => v > 0).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wider text-slate-500">
          Padrões
        </span>
        {PATTERN_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPattern(preset.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              patternId === preset.id
                ? "border-sky-400/60 bg-sky-400/15 text-sky-200"
                : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
            }`}
          >
            {preset.name}
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-500/60 hover:text-rose-200"
        >
          <Trash2 size={13} />
          Limpar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/70 p-0.5">
          <button
            type="button"
            onClick={() => setIsErasing(false)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              !isErasing ? "bg-sky-500/20 text-sky-200" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Paintbrush size={13} /> Pincel
          </button>
          <button
            type="button"
            onClick={() => setIsErasing(true)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              isErasing ? "bg-rose-500/20 text-rose-200" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Eraser size={13} /> Borracha
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Intensidade</span>
          {BRUSH_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => {
                setBrush(level);
                setIsErasing(false);
              }}
              className={`h-7 w-7 rounded-md font-mono text-[10px] transition ${
                brush === level && !isErasing
                  ? "ring-2 ring-sky-400"
                  : "ring-1 ring-slate-700 hover:ring-slate-500"
              }`}
              style={inputColor(level)}
            >
              {formatIntensity(level, valueScale)}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleScale}
          className="ml-auto rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 font-mono text-xs text-slate-300 transition hover:border-slate-600 hover:text-slate-100"
        >
          escala: {valueScale === "unit" ? "0 – 1" : "0 – 255"}
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <MatrixGrid
          matrix={matrix}
          cellSize={44}
          interactive
          colorFor={(value) => inputColor(value)}
          formatValue={(value) => formatIntensity(value, valueScale)}
          onCellPointerDown={(row, col, event) => {
            event.preventDefault();
            setIsDrawing(true);
            paint(row, col);
          }}
          onCellPointerEnter={(row, col) => {
            if (isDrawing) paint(row, col);
          }}
        />

        <dl className="grid min-w-[160px] gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-500">Dimensão</dt>
            <dd className="font-mono text-lg text-slate-200">
              {matrix.length} × {matrix[0]?.length ?? 0} × 1
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-500">Total de pixels</dt>
            <dd className="font-mono text-lg text-slate-200">
              {matrix.length * (matrix[0]?.length ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-500">Pixels acesos</dt>
            <dd className="font-mono text-lg text-sky-300">{litPixels}</dd>
          </div>
        </dl>
      </div>

      <Legend
        items={[
          { color: "#0f172a", label: "0 — preto absoluto" },
          { color: PALETTE.input, label: "1 — branco / intensidade máxima" },
        ]}
      />
    </div>
  );
}
