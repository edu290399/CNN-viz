"use client";

import { motion } from "framer-motion";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { CellColor } from "@/lib/colors";
import type { Matrix } from "@/lib/cnn";

export type HighlightRect = {
  row: number;
  col: number;
  rows: number;
  cols: number;
  color: string;
};

export type CellState = {
  /** Cor do anel de destaque desenhado sobre a célula. */
  ring?: string;
  /** Célula ainda não calculada: vira um placeholder tracejado. */
  pending?: boolean;
  opacity?: number;
};

type MatrixGridProps = {
  matrix: Matrix;
  colorFor: (value: number, row: number, col: number) => CellColor;
  formatValue: (value: number) => string;
  cellSize?: number;
  gap?: number;
  showValues?: boolean;
  highlight?: HighlightRect | null;
  cellState?: (row: number, col: number, value: number) => CellState | undefined;
  onCellPointerDown?: (row: number, col: number, event: ReactPointerEvent) => void;
  onCellPointerEnter?: (row: number, col: number, event: ReactPointerEvent) => void;
  onCellHover?: (row: number, col: number) => void;
  onPointerLeaveGrid?: () => void;
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
};

export default function MatrixGrid({
  matrix,
  colorFor,
  formatValue,
  cellSize = 40,
  gap = 3,
  showValues = true,
  highlight,
  cellState,
  onCellPointerDown,
  onCellPointerEnter,
  onCellHover,
  onPointerLeaveGrid,
  interactive = false,
  className = "",
  style,
}: MatrixGridProps) {
  const cols = matrix[0]?.length ?? 0;
  const step = cellSize + gap;
  const fontSize = Math.max(9, Math.min(13, cellSize * 0.32));

  return (
    <div
      className={`relative select-none ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridAutoRows: `${cellSize}px`,
        gap: `${gap}px`,
        touchAction: interactive ? "none" : undefined,
        ...style,
      }}
      onPointerLeave={onPointerLeaveGrid}
    >
      {matrix.map((row, r) =>
        row.map((value, c) => {
          const state = cellState?.(r, c, value);
          const { background, color } = colorFor(value, r, c);

          if (state?.pending) {
            return (
              <div
                key={`${r}-${c}`}
                className="rounded-[4px] border border-dashed border-slate-700/70 bg-slate-900/40"
              />
            );
          }

          return (
            <div
              key={`${r}-${c}`}
              onPointerDown={(e) => onCellPointerDown?.(r, c, e)}
              onPointerEnter={(e) => {
                onCellPointerEnter?.(r, c, e);
                onCellHover?.(r, c);
              }}
              className={`flex items-center justify-center rounded-[4px] font-mono tabular-nums transition-colors duration-150 ${
                interactive ? "cursor-crosshair" : ""
              }`}
              style={{
                background,
                color,
                fontSize,
                opacity: state?.opacity ?? 1,
                boxShadow: state?.ring
                  ? `inset 0 0 0 2px ${state.ring}`
                  : "inset 0 0 0 1px rgb(30 41 59 / 0.9)",
              }}
            >
              {showValues ? formatValue(value) : null}
            </div>
          );
        })
      )}

      {highlight ? (
        <motion.div
          className="pointer-events-none absolute left-0 top-0 rounded-md"
          initial={false}
          animate={{
            x: highlight.col * step,
            y: highlight.row * step,
          }}
          transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.6 }}
          style={{
            width: highlight.cols * cellSize + (highlight.cols - 1) * gap,
            height: highlight.rows * cellSize + (highlight.rows - 1) * gap,
            boxShadow: `0 0 0 2px ${highlight.color}, 0 0 18px 2px ${highlight.color}55`,
          }}
        />
      ) : null}
    </div>
  );
}
