"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import MatrixGrid from "@/components/matrix/MatrixGrid";
import Legend from "@/components/ui/Legend";
import PlaybackControls from "@/components/ui/PlaybackControls";
import { useStepPlayer } from "@/hooks/useStepPlayer";
import type { Matrix, PoolResult } from "@/lib/cnn";
import { formatSigned, PALETTE, poolColor, signedColor } from "@/lib/colors";

type PoolingLayerProps = {
  activated: Matrix;
  pool: PoolResult;
  activatedScale: number;
  poolScale: number;
};

export default function PoolingLayer({
  activated,
  pool,
  activatedScale,
  poolScale,
}: PoolingLayerProps) {
  const player = useStepPlayer(pool.steps.length, 450);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [revealAll, setRevealAll] = useState(false);

  const activeIndex = hoveredIndex ?? player.index;
  const step = pool.steps[activeIndex] ?? null;
  const outCols = pool.output[0]?.length ?? 0;

  const inputCells = activated.length * (activated[0]?.length ?? 0);
  const outputCells = pool.output.length * outCols;

  return (
    <div className="flex flex-col gap-6">
      <PlaybackControls
        player={player}
        accent={PALETTE.pool}
        status={`janela ${activeIndex + 1} de ${pool.steps.length}`}
      />

      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-300">
            Mapa de ativação {activated.length}×{activated[0]?.length ?? 0}
          </span>
          <MatrixGrid
            matrix={activated}
            cellSize={38}
            colorFor={(value) => signedColor(value, activatedScale)}
            formatValue={formatSigned}
            highlight={
              step
                ? { row: step.inRow, col: step.inCol, rows: 2, cols: 2, color: PALETTE.pool }
                : null
            }
            cellState={(row, col) => {
              if (!step) return undefined;
              const inWindow =
                row >= step.inRow &&
                row < step.inRow + 2 &&
                col >= step.inCol &&
                col < step.inCol + 2;
              if (!inWindow) return { opacity: 0.4 };
              const isWinner =
                row === step.inRow + step.maxOffsetRow &&
                col === step.inCol + step.maxOffsetCol;
              return isWinner ? { ring: "#f8fafc" } : undefined;
            }}
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          {step ? (
            <motion.div
              key={step.index}
              initial={{ opacity: 0.3, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center"
            >
              <div
                className="mx-auto grid gap-1"
                style={{ gridTemplateColumns: "repeat(2, 40px)" }}
              >
                {step.window.map((row, r) =>
                  row.map((value, c) => (
                    <div
                      key={`${r}-${c}`}
                      className="flex h-10 items-center justify-center rounded-md font-mono text-xs"
                      style={{
                        ...signedColor(value, activatedScale),
                        boxShadow:
                          r === step.maxOffsetRow && c === step.maxOffsetCol
                            ? `inset 0 0 0 2px ${PALETTE.pool}`
                            : "inset 0 0 0 1px rgb(30 41 59)",
                      }}
                    >
                      {formatSigned(value)}
                    </div>
                  ))
                )}
              </div>
              <p className="mt-2 font-mono text-[11px] text-slate-400">
                max({step.window.flat().map(formatSigned).join(", ")}) ={" "}
                <span className="text-violet-300">{formatSigned(step.max)}</span>
              </p>
            </motion.div>
          ) : null}
          <ArrowRight className="text-slate-600" size={22} />
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-violet-300">
            Pooled {pool.output.length}×{outCols}
          </span>
          <MatrixGrid
            matrix={pool.output}
            cellSize={44}
            colorFor={(value) => poolColor(value, poolScale)}
            formatValue={formatSigned}
            onCellHover={(row, col) => {
              player.pause();
              setHoveredIndex(row * outCols + col);
            }}
            onPointerLeaveGrid={() => setHoveredIndex(null)}
            cellState={(row, col) => {
              if (!revealAll && row * outCols + col > activeIndex) return { pending: true };
              if (step && step.outRow === row && step.outCol === col) {
                return { ring: "#f8fafc" };
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
              className="h-3.5 w-3.5 accent-violet-400"
            />
            revelar matriz completa
          </label>
        </div>
      </div>

      <p className="text-center text-sm text-slate-400">
        Redução de dimensionalidade:{" "}
        <span className="font-mono text-slate-200">{inputCells}</span> valores viraram{" "}
        <span className="font-mono text-violet-300">{outputCells}</span> —{" "}
        <span className="text-violet-300">
          {Math.round((1 - outputCells / Math.max(inputCells, 1)) * 100)}% menos dados
        </span>{" "}
        para a próxima camada processar.
      </p>

      <Legend
        items={[
          { color: PALETTE.pool, label: "janela 2×2 (stride 2)", outline: true },
          { color: "#f8fafc", label: "valor vencedor (máximo)", outline: true },
          { color: "#334155", label: "ainda não calculado" },
        ]}
      />
    </div>
  );
}
