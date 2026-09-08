"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import MatrixGrid from "@/components/matrix/MatrixGrid";
import Legend from "@/components/ui/Legend";
import PlaybackControls from "@/components/ui/PlaybackControls";
import { useStepPlayer } from "@/hooks/useStepPlayer";
import type { Prediction } from "@/lib/classifier";
import { normalize, type FlatEntry, type Matrix } from "@/lib/cnn";
import { formatPrecise, formatSigned, PALETTE, poolColor } from "@/lib/colors";
import { CLASSES } from "@/lib/patterns";

type FlattenLayerProps = {
  pooled: Matrix;
  flat: FlatEntry[];
  poolScale: number;
  denseWeights: number[][];
  prediction: Prediction;
};

// Geometria do diagrama (em unidades de viewBox do SVG).
const SVG_W = 520;
const CELL_H = 22;
const CELL_GAP = 4;
const CELL_W = 58;
const VECTOR_X = 62;
const NODE_X = 330;
const NODE_W = 178;
const NODE_H = 72;

export default function FlattenLayer({
  pooled,
  flat,
  poolScale,
  denseWeights,
  prediction,
}: FlattenLayerProps) {
  const player = useStepPlayer(flat.length, 160);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [revealAll, setRevealAll] = useState(false);

  const activeIndex = player.index;
  const revealedCount = revealAll ? flat.length : activeIndex + 1;

  const svgH = flat.length * (CELL_H + CELL_GAP) + 16;
  const cellY = (i: number) => 8 + i * (CELL_H + CELL_GAP);
  const nodeY = (j: number) => (svgH / CLASSES.length) * j + svgH / CLASSES.length / 2 - NODE_H / 2;

  const normalized = normalize(flat.map((e) => e.value));
  const maxWeight = Math.max(...denseWeights.flat().map(Math.abs), 1e-6);

  const focusNode = hoveredNode ?? prediction.winnerIndex;
  const activeEntry = flat[activeIndex];

  return (
    <div className="flex flex-col gap-6">
      <PlaybackControls
        player={player}
        accent={PALETTE.dense}
        status={`elemento ${activeIndex + 1} de ${flat.length}`}
      />

      <div className="flex flex-wrap items-start justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-violet-300">
            Pooled {pooled.length}×{pooled[0]?.length ?? 0}
          </span>
          <MatrixGrid
            matrix={pooled}
            cellSize={44}
            colorFor={(value) => poolColor(value, poolScale)}
            formatValue={formatSigned}
            cellState={(row, col) => {
              const index = flat.findIndex((e) => e.row === row && e.col === col);
              if (index < revealedCount - 1) return { opacity: 0.45 };
              if (index === revealedCount - 1) return { ring: "#f8fafc" };
              return undefined;
            }}
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={revealAll}
              onChange={(e) => setRevealAll(e.target.checked)}
              className="h-3.5 w-3.5 accent-cyan-400"
            />
            desenrolar tudo
          </label>
        </div>

        <svg
          viewBox={`0 0 ${SVG_W} ${svgH}`}
          className="h-auto w-full max-w-[560px]"
          role="img"
          aria-label="Vetor achatado conectado aos neurônios de saída"
        >
          {/* conexões: uma linha por (elemento do vetor, classe de saída) */}
          {flat.map((entry, i) =>
            i < revealedCount
              ? denseWeights.map((weights, j) => {
                  const weight = weights[i] ?? 0;
                  const strength = Math.abs(weight) / maxWeight;
                  const isFocused = focusNode === j;
                  return (
                    <line
                      key={`${i}-${j}`}
                      x1={VECTOR_X + CELL_W}
                      y1={cellY(i) + CELL_H / 2}
                      x2={NODE_X}
                      y2={nodeY(j) + NODE_H / 2}
                      stroke={weight >= 0 ? PALETTE.positive : PALETTE.negative}
                      strokeWidth={0.4 + strength * 2.2}
                      opacity={(isFocused ? 0.22 + strength * 0.75 : 0.05 + strength * 0.1)}
                    />
                  );
                })
              : null
          )}

          {/* o vetor 1D */}
          {flat.map((entry, i) => {
            const revealed = i < revealedCount;
            return (
              <motion.g
                key={entry.index}
                initial={false}
                animate={{ opacity: revealed ? 1 : 0.15 }}
                transition={{ duration: 0.2 }}
              >
                <text
                  x={VECTOR_X - 8}
                  y={cellY(i) + CELL_H / 2 + 3.5}
                  textAnchor="end"
                  className="font-mono"
                  fontSize={9}
                  fill="#64748b"
                >
                  [{entry.row},{entry.col}]
                </text>
                <rect
                  x={VECTOR_X}
                  y={cellY(i)}
                  width={CELL_W}
                  height={CELL_H}
                  rx={4}
                  fill={revealed ? poolColor(entry.value, poolScale).background : "#0f172a"}
                  stroke={
                    revealed && i === revealedCount - 1 ? "#f8fafc" : "rgb(30 41 59)"
                  }
                  strokeWidth={revealed && i === revealedCount - 1 ? 1.8 : 1}
                  strokeDasharray={revealed ? undefined : "3 3"}
                />
                {revealed ? (
                  <text
                    x={VECTOR_X + CELL_W / 2}
                    y={cellY(i) + CELL_H / 2 + 3.5}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize={10}
                    fill={poolColor(entry.value, poolScale).color}
                  >
                    {formatSigned(entry.value)}
                  </text>
                ) : null}
              </motion.g>
            );
          })}

          {/* neurônios de saída */}
          {CLASSES.map((cls, j) => {
            const probability = prediction.probabilities[j] ?? 0;
            const isWinner = prediction.winnerIndex === j;
            const y = nodeY(j);
            return (
              <g
                key={cls.id}
                onMouseEnter={() => setHoveredNode(j)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                <rect
                  x={NODE_X}
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  fill={isWinner ? "rgb(16 47 51)" : "rgb(15 23 42)"}
                  stroke={isWinner ? PALETTE.dense : "rgb(51 65 85)"}
                  strokeWidth={isWinner ? 2 : 1}
                />
                <text x={NODE_X + 14} y={y + 22} fontSize={12} fill="#e2e8f0">
                  {cls.label}
                </text>
                <text
                  x={NODE_X + NODE_W - 14}
                  y={y + 22}
                  textAnchor="end"
                  className="font-mono"
                  fontSize={12}
                  fill={isWinner ? PALETTE.dense : "#94a3b8"}
                >
                  {(probability * 100).toFixed(1)}%
                </text>
                <rect
                  x={NODE_X + 14}
                  y={y + 32}
                  width={NODE_W - 28}
                  height={7}
                  rx={3.5}
                  fill="rgb(30 41 59)"
                />
                <motion.rect
                  x={NODE_X + 14}
                  y={y + 32}
                  height={7}
                  rx={3.5}
                  fill={isWinner ? PALETTE.dense : "#475569"}
                  initial={false}
                  animate={{ width: Math.max(probability * (NODE_W - 28), 2) }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                />
                <text
                  x={NODE_X + 14}
                  y={y + 58}
                  className="font-mono"
                  fontSize={9.5}
                  fill="#64748b"
                >
                  score = {formatPrecise(prediction.scores[j] ?? 0)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Elemento atual do vetor
          </p>
          {activeEntry ? (
            <p className="font-mono text-sm text-slate-300">
              x[{activeEntry.index}] ={" "}
              <span className="text-violet-300">{formatSigned(activeEntry.value)}</span>{" "}
              <span className="text-slate-500">
                (veio da posição [{activeEntry.row}, {activeEntry.col}] do pooling)
              </span>
            </p>
          ) : null}
          <p className="mt-2 font-mono text-xs text-slate-500">
            normalizado: {formatPrecise(normalized[activeIndex] ?? 0)} · peso para “
            {CLASSES[focusNode].label}”:{" "}
            <span
              style={{
                color:
                  (denseWeights[focusNode]?.[activeIndex] ?? 0) >= 0
                    ? PALETTE.positive
                    : PALETTE.negative,
              }}
            >
              {formatPrecise(denseWeights[focusNode]?.[activeIndex] ?? 0)}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Predição da rede
          </p>
          <p className="text-lg font-semibold text-cyan-300">
            {CLASSES[prediction.winnerIndex].label}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            confiança de {(prediction.probabilities[prediction.winnerIndex] * 100).toFixed(1)}% —
            resultado de softmax(W · x) sobre o vetor achatado.
          </p>
        </div>
      </div>

      <Legend
        items={[
          { color: PALETTE.positive, label: "peso positivo (evidência a favor)" },
          { color: PALETTE.negative, label: "peso negativo (evidência contra)" },
          { color: PALETTE.dense, label: "neurônio vencedor" },
        ]}
      />
    </div>
  );
}
