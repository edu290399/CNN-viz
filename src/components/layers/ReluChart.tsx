"use client";

import { PALETTE } from "@/lib/colors";
import { formatSigned } from "@/lib/colors";

const W = 210;
const H = 170;
const PAD = 24;

type ReluChartProps = {
  /** Valor destacado no gráfico (a célula sob o cursor), ou `null`. */
  value: number | null;
  scale: number;
};

export default function ReluChart({ value, scale }: ReluChartProps) {
  const span = Math.max(scale, 1);
  const xToPx = (x: number) => PAD + ((x + span) / (2 * span)) * (W - 2 * PAD);
  const yToPx = (y: number) => H - PAD - (y / span) * (H - 2 * PAD);

  const marker =
    value === null
      ? null
      : { x: xToPx(value), y: yToPx(Math.max(0, value)), out: Math.max(0, value) };

  const isNegative = value !== null && value < 0;

  return (
    <figure className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <figcaption className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        f(x) = max(0, x)
      </figcaption>
      <svg width={W} height={H} role="img" aria-label="Gráfico da função ReLU">
        {/* eixos */}
        <line
          x1={PAD}
          y1={yToPx(0)}
          x2={W - PAD}
          y2={yToPx(0)}
          stroke="#334155"
          strokeWidth={1}
        />
        <line
          x1={xToPx(0)}
          y1={PAD - 6}
          x2={xToPx(0)}
          y2={H - PAD + 8}
          stroke="#334155"
          strokeWidth={1}
        />

        {/* a função: plana nos negativos, identidade nos positivos */}
        <polyline
          points={`${xToPx(-span)},${yToPx(0)} ${xToPx(0)},${yToPx(0)}`}
          fill="none"
          stroke={PALETTE.negative}
          strokeWidth={2.5}
        />
        <polyline
          points={`${xToPx(0)},${yToPx(0)} ${xToPx(span)},${yToPx(span)}`}
          fill="none"
          stroke={PALETTE.positive}
          strokeWidth={2.5}
        />

        {marker ? (
          <g>
            <line
              x1={marker.x}
              y1={yToPx(0)}
              x2={marker.x}
              y2={marker.y}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <line
              x1={marker.x}
              y1={marker.y}
              x2={xToPx(0)}
              y2={marker.y}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={marker.x}
              cy={marker.y}
              r={4.5}
              fill={isNegative ? PALETTE.negative : PALETTE.positive}
              stroke="#0f172a"
              strokeWidth={1.5}
            />
          </g>
        ) : null}

        <text x={W - PAD + 2} y={yToPx(0) + 4} fill="#475569" fontSize={9}>
          x
        </text>
      </svg>
      <p className="h-4 font-mono text-[11px] text-slate-400">
        {value === null
          ? "passe o mouse numa célula"
          : `${formatSigned(value)} → ${formatSigned(Math.max(0, value))}`}
      </p>
    </figure>
  );
}
