"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import MatrixGrid from "@/components/matrix/MatrixGrid";
import Legend from "@/components/ui/Legend";
import ReluChart from "@/components/layers/ReluChart";
import { countClipped, type Matrix } from "@/lib/cnn";
import { formatSigned, PALETTE, signedColor } from "@/lib/colors";

type ReluLayerProps = {
  featureMap: Matrix;
  activated: Matrix;
  scale: number;
};

export default function ReluLayer({ featureMap, activated, scale }: ReluLayerProps) {
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);
  const clipped = countClipped(featureMap);
  const total = featureMap.length * (featureMap[0]?.length ?? 0);

  const isHovered = (row: number, col: number) =>
    hovered?.row === row && hovered?.col === col;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Antes — saída da convolução
          </span>
          <MatrixGrid
            matrix={featureMap}
            cellSize={38}
            colorFor={(value) => signedColor(value, scale)}
            formatValue={formatSigned}
            onCellHover={(row, col) => setHovered({ row, col })}
            onPointerLeaveGrid={() => setHovered(null)}
            cellState={(row, col, value) => {
              if (isHovered(row, col)) return { ring: "#e2e8f0" };
              if (value < 0) return { ring: PALETTE.negative };
              return undefined;
            }}
          />
          <span className="font-mono text-xs text-rose-300">
            {clipped} de {total} valores são negativos
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 text-slate-500">
          <ArrowRight size={22} />
          <span className="font-mono text-xs text-emerald-300">max(0, x)</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-300">
            Depois — mapa de ativação
          </span>
          <MatrixGrid
            matrix={activated}
            cellSize={38}
            colorFor={(value) => signedColor(value, scale)}
            formatValue={formatSigned}
            onCellHover={(row, col) => setHovered({ row, col })}
            onPointerLeaveGrid={() => setHovered(null)}
            cellState={(row, col) => {
              if (isHovered(row, col)) return { ring: "#e2e8f0" };
              if (featureMap[row][col] < 0) return { ring: `${PALETTE.negative}80` };
              return undefined;
            }}
          />
          <span className="font-mono text-xs text-slate-500">
            {clipped} neurônios “desligados”
          </span>
        </div>

        <ReluChart
          value={hovered ? featureMap[hovered.row][hovered.col] : null}
          scale={scale}
        />
      </div>

      <Legend
        items={[
          { color: PALETTE.negative, label: "valor negativo — será zerado", outline: true },
          { color: PALETTE.positive, label: "valor positivo — passa intacto" },
          { color: "#0f172a", label: "zero após ReLU" },
        ]}
      />
    </div>
  );
}
