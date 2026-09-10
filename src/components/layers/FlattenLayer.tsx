"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import MatrixGrid from "@/components/matrix/MatrixGrid";
import Legend from "@/components/ui/Legend";
import PlaybackControls from "@/components/ui/PlaybackControls";
import { useStepPlayer } from "@/hooks/useStepPlayer";
import { inputInfluence, type DenseModel, type Prediction } from "@/lib/classifier";
import type { FlatEntry, Matrix } from "@/lib/cnn";
import { formatPrecise, formatSigned, PALETTE, poolColor } from "@/lib/colors";
import { CLASSES } from "@/lib/patterns";

type FlattenLayerProps = {
  pooled: Matrix;
  flat: FlatEntry[];
  poolScale: number;
  model: DenseModel;
  prediction: Prediction;
  isTraining: boolean;
};

// Geometria do diagrama, em unidades de viewBox do SVG.
const SVG_W = 560;
const TOP = 26;
const BOTTOM = 10;
const CELL_H = 22;
const CELL_GAP = 4;
const CELL_W = 52;
const VECTOR_X = 54;
const HIDDEN_X = 252;
const HIDDEN_R = 9;
const NODE_X = 374;
const NODE_W = 176;
const NODE_H = 72;

export default function FlattenLayer({
  pooled,
  flat,
  poolScale,
  model,
  prediction,
  isTraining,
}: FlattenLayerProps) {
  const player = useStepPlayer(flat.length, 160);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [hoveredHidden, setHoveredHidden] = useState<number | null>(null);
  const [revealAll, setRevealAll] = useState(false);

  const activeIndex = player.index;
  const revealedCount = revealAll ? flat.length : activeIndex + 1;

  const hiddenCount = model.hidden.weights.length;
  const svgH = TOP + flat.length * (CELL_H + CELL_GAP) + BOTTOM;
  const innerH = svgH - TOP - BOTTOM;

  const cellY = (i: number) => TOP + i * (CELL_H + CELL_GAP);
  const hiddenY = (h: number) => TOP + ((h + 0.5) * innerH) / hiddenCount;
  const nodeY = (j: number) =>
    TOP + (innerH / CLASSES.length) * j + innerH / CLASSES.length / 2 - NODE_H / 2;

  const maxHiddenWeight = Math.max(
    ...model.hidden.weights.flat().map(Math.abs),
    1e-6
  );
  const maxOutputWeight = Math.max(
    ...model.output.weights.flat().map(Math.abs),
    1e-6
  );
  const maxActivation = Math.max(...prediction.hiddenActivations.map(Math.abs), 1e-6);

  const focusNode = hoveredNode ?? prediction.winnerIndex;
  const activeEntry = flat[activeIndex];
  const influence = inputInfluence(model, prediction.features, focusNode);
  const maxInfluence = Math.max(...influence.map(Math.abs), 1e-6);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PlaybackControls
          player={player}
          accent={PALETTE.dense}
          status={`elemento ${activeIndex + 1} de ${flat.length}`}
        />
        <span className="font-mono text-xs text-slate-500">
          {isTraining ? (
            <span className="text-cyan-300">treinando com o novo kernel…</span>
          ) : (
            <>acurácia no treino: {(model.trainAccuracy * 100).toFixed(1)}%</>
          )}
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-6">
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
          className="h-auto w-full max-w-[620px]"
          role="img"
          aria-label="Vetor achatado conectado à camada oculta e aos neurônios de saída"
        >
          <text x={VECTOR_X} y={14} fontSize={9.5} fill="#64748b" className="font-mono">
            flatten ({flat.length})
          </text>
          <text
            x={HIDDEN_X}
            y={14}
            textAnchor="middle"
            fontSize={9.5}
            fill="#64748b"
            className="font-mono"
          >
            oculta ({hiddenCount}) · ReLU
          </text>
          <text x={NODE_X} y={14} fontSize={9.5} fill="#64748b" className="font-mono">
            saída ({CLASSES.length}) · softmax
          </text>

          {/* flatten -> camada oculta */}
          {flat.map((_, i) =>
            i < revealedCount
              ? model.hidden.weights.map((row, h) => {
                  const weight = row[i] ?? 0;
                  const strength = Math.abs(weight) / maxHiddenWeight;
                  const focused = hoveredHidden === h;
                  const dimmed = hoveredHidden !== null && !focused;
                  return (
                    <line
                      key={`i${i}-h${h}`}
                      x1={VECTOR_X + CELL_W}
                      y1={cellY(i) + CELL_H / 2}
                      x2={HIDDEN_X - HIDDEN_R}
                      y2={hiddenY(h)}
                      stroke={weight >= 0 ? PALETTE.positive : PALETTE.negative}
                      strokeWidth={focused ? 0.5 + strength * 1.8 : 0.35 + strength * 0.7}
                      opacity={
                        focused ? 0.2 + strength * 0.7 : dimmed ? 0.015 : 0.03 + strength * 0.1
                      }
                    />
                  );
                })
              : null
          )}

          {/* camada oculta -> saída */}
          {model.output.weights.map((row, j) =>
            row.map((weight, h) => {
              const strength = Math.abs(weight) / maxOutputWeight;
              const focused =
                hoveredHidden !== null ? hoveredHidden === h : focusNode === j;
              return (
                <line
                  key={`h${h}-o${j}`}
                  x1={HIDDEN_X + HIDDEN_R}
                  y1={hiddenY(h)}
                  x2={NODE_X}
                  y2={nodeY(j) + NODE_H / 2}
                  stroke={weight >= 0 ? PALETTE.positive : PALETTE.negative}
                  strokeWidth={focused ? 0.6 + strength * 2.4 : 0.4 + strength * 0.8}
                  opacity={focused ? 0.25 + strength * 0.7 : 0.05 + strength * 0.12}
                />
              );
            })
          )}

          {/* o vetor 1D */}
          {flat.map((entry, i) => {
            const revealed = i < revealedCount;
            const isCurrent = revealed && i === revealedCount - 1;
            return (
              <motion.g
                key={entry.index}
                initial={false}
                animate={{ opacity: revealed ? 1 : 0.2 }}
                transition={{ duration: 0.2 }}
              >
                <text
                  x={VECTOR_X - 6}
                  y={cellY(i) + CELL_H / 2 + 3.5}
                  textAnchor="end"
                  className="font-mono"
                  fontSize={8.5}
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
                  stroke={isCurrent ? "#f8fafc" : "rgb(30 41 59)"}
                  strokeWidth={isCurrent ? 1.8 : 1}
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

          {/* unidades da camada oculta: o preenchimento mostra quem disparou */}
          {prediction.hiddenActivations.map((activation, h) => {
            const intensity = activation / maxActivation;
            const focused = hoveredHidden === h;
            return (
              <g
                key={`hidden-${h}`}
                onMouseEnter={() => setHoveredHidden(h)}
                onMouseLeave={() => setHoveredHidden(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={HIDDEN_X}
                  cy={hiddenY(h)}
                  r={HIDDEN_R + 6}
                  fill="transparent"
                />
                <circle
                  cx={HIDDEN_X}
                  cy={hiddenY(h)}
                  r={HIDDEN_R}
                  fill={
                    activation > 0
                      ? `rgb(52 211 153 / ${(0.15 + intensity * 0.85).toFixed(2)})`
                      : "rgb(15 23 42)"
                  }
                  stroke={focused ? "#f8fafc" : activation > 0 ? PALETTE.positive : "#334155"}
                  strokeWidth={focused ? 2 : 1}
                />
                {activation <= 0 ? (
                  <text
                    x={HIDDEN_X}
                    y={hiddenY(h) + 3}
                    textAnchor="middle"
                    fontSize={8}
                    fill="#475569"
                    className="font-mono"
                  >
                    0
                  </text>
                ) : null}
              </g>
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
                <rect
                  x={NODE_X + 14}
                  y={y + 32}
                  width={Math.max(probability * (NODE_W - 28), 2)}
                  height={7}
                  rx={3.5}
                  fill={isWinner ? PALETTE.dense : "#475569"}
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Elemento atual do vetor
          </p>
          {activeEntry ? (
            <>
              <p className="font-mono text-sm text-slate-300">
                x[{activeEntry.index}] ={" "}
                <span className="text-violet-300">{formatSigned(activeEntry.value)}</span>
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                origem: pooling [{activeEntry.row}, {activeEntry.col}] · normalizado:{" "}
                {formatPrecise(prediction.features[activeEntry.index] ?? 0)}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                influência em “{CLASSES[focusNode].label}”:{" "}
                <span
                  className="font-mono"
                  style={{
                    color:
                      (influence[activeEntry.index] ?? 0) >= 0
                        ? PALETTE.positive
                        : PALETTE.negative,
                  }}
                >
                  {formatPrecise(influence[activeEntry.index] ?? 0)}
                </span>{" "}
                <span className="text-slate-600">
                  ({Math.round((Math.abs(influence[activeEntry.index] ?? 0) / maxInfluence) * 100)}
                  % da maior)
                </span>
              </p>
            </>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Camada oculta
          </p>
          <p className="font-mono text-sm text-slate-300">
            {prediction.hiddenActivations.filter((a) => a > 0).length} de {hiddenCount}{" "}
            unidades ativas
          </p>
          <p className="mt-1 text-xs text-slate-500">
            As desligadas (marcadas com <span className="font-mono">0</span>) tiveram soma
            negativa e o ReLU as zerou. Passe o mouse numa unidade para ver de onde ela tira
            evidência.
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
            confiança de {(prediction.probabilities[prediction.winnerIndex] * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <Legend
        items={[
          { color: PALETTE.positive, label: "peso positivo (evidência a favor)" },
          { color: PALETTE.negative, label: "peso negativo (evidência contra)" },
          { color: PALETTE.positive, label: "unidade oculta ativa", outline: true },
          { color: PALETTE.dense, label: "neurônio vencedor" },
        ]}
      />
    </div>
  );
}
