"use client";

import { motion } from "framer-motion";
import type { ConvStep, Matrix } from "@/lib/cnn";
import {
  formatIntensity,
  formatPrecise,
  inputColor,
  kernelColor,
  PALETTE,
  signedColor,
  type ValueScale,
} from "@/lib/colors";

type MiniGridProps = {
  matrix: Matrix;
  colorFor: (value: number) => { background: string; color: string };
  format: (value: number) => string;
  title: string;
  titleColor: string;
};

function MiniGrid({ matrix, colorFor, format, title, titleColor }: MiniGridProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: titleColor }}
      >
        {title}
      </span>
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(3, 44px)" }}>
        {matrix.map((row, r) =>
          row.map((value, c) => (
            <div
              key={`${r}-${c}`}
              className="flex h-11 items-center justify-center rounded-md font-mono text-xs ring-1 ring-slate-800"
              style={colorFor(value)}
            >
              {format(value)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Operator({ symbol }: { symbol: string }) {
  return (
    <span className="mt-6 select-none text-xl font-light text-slate-500">{symbol}</span>
  );
}

type ConvolutionMathProps = {
  step: ConvStep | null;
  kernel: Matrix;
  valueScale: ValueScale;
};

export default function ConvolutionMath({
  step,
  kernel,
  valueScale,
}: ConvolutionMathProps) {
  if (!step) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
        Passe o mouse sobre o feature map ou aperte “Animar” para ver o cálculo.
      </div>
    );
  }

  const kernelScale = Math.max(...kernel.flat().map(Math.abs), 1);
  const productScale = Math.max(...step.products.flat().map(Math.abs), 1);
  const terms = step.patch.flat().map((value, i) => ({
    value,
    weight: kernel.flat()[i],
    product: step.products.flat()[i],
  }));

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/50 p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-300">
          Célula de saída{" "}
          <span className="font-mono text-emerald-300">
            [{step.outRow}, {step.outCol}]
          </span>{" "}
          — janela sobre a entrada a partir de{" "}
          <span className="font-mono text-sky-300">
            [{step.inRow}, {step.inCol}]
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-3">
        <MiniGrid
          matrix={step.patch}
          colorFor={(v) => inputColor(v)}
          format={(v) => formatIntensity(v, valueScale)}
          title="Submatriz"
          titleColor={PALETTE.input}
        />
        <Operator symbol="⊙" />
        <MiniGrid
          matrix={kernel}
          colorFor={(v) => kernelColor(v, kernelScale)}
          format={formatPrecise}
          title="Kernel"
          titleColor={PALETTE.kernel}
        />
        <Operator symbol="=" />
        <MiniGrid
          matrix={step.products}
          colorFor={(v) => signedColor(v, productScale)}
          format={formatPrecise}
          title="Produtos"
          titleColor={PALETTE.positive}
        />
        <Operator symbol="→" />
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            Soma
          </span>
          <motion.div
            key={step.index}
            initial={{ scale: 0.85, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="flex h-11 min-w-[68px] items-center justify-center rounded-md px-3 font-mono text-base font-semibold"
            style={signedColor(step.sum, Math.max(Math.abs(step.sum), 1))}
          >
            {formatPrecise(step.sum)}
          </motion.div>
        </div>
      </div>

      <div className="rounded-lg bg-slate-900/70 p-3 font-mono text-[11px] leading-relaxed text-slate-400">
        {terms.map((term, i) => (
          <span key={i} className={term.product !== 0 ? "text-slate-200" : ""}>
            {i > 0 ? " + " : ""}({formatPrecise(term.value)}×{formatPrecise(term.weight)})
          </span>
        ))}
        <span className="text-emerald-300"> = {formatPrecise(step.sum)}</span>
      </div>
    </div>
  );
}
