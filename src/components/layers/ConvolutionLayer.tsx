"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import ConvolutionMath from "@/components/layers/ConvolutionMath";
import KernelEditor from "@/components/matrix/KernelEditor";
import MatrixGrid from "@/components/matrix/MatrixGrid";
import Legend from "@/components/ui/Legend";
import PlaybackControls from "@/components/ui/PlaybackControls";
import { useStepPlayer } from "@/hooks/useStepPlayer";
import { padMatrix, type ConvResult, type Matrix } from "@/lib/cnn";
import {
  formatIntensity,
  formatSigned,
  inputColor,
  PALETTE,
  signedColor,
  type ValueScale,
} from "@/lib/colors";

type ConvolutionLayerProps = {
  input: Matrix;
  kernel: Matrix;
  padding?: number;
  conv: ConvResult;
  scale: number;
  valueScale: ValueScale;
  onKernelChange: (weights: Matrix) => void;
  onSelectPreset: (id: string) => void;
};

export default function ConvolutionLayer({
  input,
  kernel,
  padding = 0,
  conv,
  scale,
  valueScale,
  onKernelChange,
  onSelectPreset,
}: ConvolutionLayerProps) {
  const player = useStepPlayer(conv.steps.length);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [revealAll, setRevealAll] = useState(false);

  const activeIndex = hoveredIndex ?? player.index;
  const activeStep = conv.steps[activeIndex] ?? null;
  const outCols = conv.output[0]?.length ?? 0;
  const display = padMatrix(input, padding);
  const displayRows = display.length;
  const displayCols = display[0]?.length ?? 0;
  const isPadCell = (row: number, col: number) =>
    padding > 0 &&
    (row < padding ||
      col < padding ||
      row >= displayRows - padding ||
      col >= displayCols - padding);

  const isRevealed = (row: number, col: number) =>
    revealAll || row * outCols + col <= activeIndex;

  return (
    <div className="flex flex-col gap-6">
      <KernelEditor
        weights={kernel}
        padding={padding}
        onChange={onKernelChange}
        onSelectPreset={onSelectPreset}
      />

      <div className="h-px bg-slate-800" />

      <PlaybackControls
        player={player}
        accent={PALETTE.kernel}
        status={`posição ${activeIndex + 1} de ${conv.steps.length}`}
      />

      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-sky-300">
            {padding > 0
              ? `Entrada ${input.length}×${input[0]?.length ?? 0} + pad ${padding}`
              : `Entrada ${input.length}×${input[0]?.length ?? 0}`}
          </span>
          <MatrixGrid
            matrix={display}
            cellSize={padding > 0 ? 28 : 34}
            colorFor={(value, row, col) =>
              isPadCell(row, col)
                ? { background: "rgb(15 23 42)", color: "#64748b" }
                : inputColor(value)
            }
            formatValue={(value) => formatIntensity(value, valueScale)}
            highlight={
              activeStep
                ? {
                    row: activeStep.inRow,
                    col: activeStep.inCol,
                    rows: kernel.length,
                    cols: kernel[0]?.length ?? 0,
                    color: PALETTE.kernel,
                  }
                : null
            }
            cellState={(row, col) => {
              if (isPadCell(row, col)) return { ring: "rgb(71 85 105 / 0.9)" };
              if (!activeStep) return undefined;
              const inWindow =
                row >= activeStep.inRow &&
                row < activeStep.inRow + kernel.length &&
                col >= activeStep.inCol &&
                col < activeStep.inCol + (kernel[0]?.length ?? 0);
              return inWindow ? undefined : { opacity: 0.45 };
            }}
          />
        </div>

        <ArrowRight className="hidden shrink-0 text-slate-600 lg:block" size={22} />

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-300">
            Feature Map {conv.output.length}×{outCols}
          </span>
          <MatrixGrid
            matrix={conv.output}
            cellSize={padding > 0 ? 28 : 34}
            colorFor={(value) => signedColor(value, scale)}
            formatValue={formatSigned}
            onCellHover={(row, col) => {
              player.pause();
              setHoveredIndex(row * outCols + col);
            }}
            onPointerLeaveGrid={() => setHoveredIndex(null)}
            cellState={(row, col) => {
              if (!isRevealed(row, col)) return { pending: true };
              if (activeStep && activeStep.outRow === row && activeStep.outCol === col) {
                return { ring: PALETTE.kernel };
              }
              return undefined;
            }}
            className="cursor-pointer"
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={revealAll}
              onChange={(e) => setRevealAll(e.target.checked)}
              className="h-3.5 w-3.5 accent-orange-400"
            />
            revelar mapa completo
          </label>
        </div>
      </div>

      <ConvolutionMath step={activeStep} kernel={kernel} valueScale={valueScale} />

      <Legend
        items={[
          { color: PALETTE.kernel, label: "janela do kernel (campo receptivo)", outline: true },
          { color: PALETTE.positive, label: "resposta positiva" },
          { color: PALETTE.negative, label: "resposta negativa" },
          { color: "#334155", label: "ainda não calculado" },
          ...(padding > 0
            ? [{ color: "#475569", label: "zero-padding (borda artificial)", outline: true }]
            : []),
        ]}
      />
    </div>
  );
}
