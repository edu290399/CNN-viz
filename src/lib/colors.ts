/**
 * Paleta semântica compartilhada por todas as camadas.
 *
 * azul   -> entrada (imagem)
 * laranja-> kernel / janela deslizante
 * verde  -> ativação positiva e cálculo em andamento
 * vermelho-> ativação negativa (o que o ReLU vai zerar)
 * violeta-> pooling
 */

type Rgb = [number, number, number];

export const PALETTE = {
  input: "#38bdf8", // sky-400
  kernel: "#fb923c", // orange-400
  positive: "#34d399", // emerald-400
  negative: "#fb7185", // rose-400
  pool: "#a78bfa", // violet-400
  dense: "#22d3ee", // cyan-400
  muted: "#64748b", // slate-500
} as const;

const SURFACE: Rgb = [15, 23, 42]; // slate-900

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mix(from: Rgb, to: Rgb, t: number): Rgb {
  const clamped = Math.min(1, Math.max(0, t));
  return [
    Math.round(from[0] + (to[0] - from[0]) * clamped),
    Math.round(from[1] + (to[1] - from[1]) * clamped),
    Math.round(from[2] + (to[2] - from[2]) * clamped),
  ];
}

function rgbToCss([r, g, b]: Rgb): string {
  return `rgb(${r} ${g} ${b})`;
}

/** Escolhe texto claro ou escuro conforme a luminância do fundo. */
function readableText([r, g, b]: Rgb): string {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#0f172a" : "#e2e8f0";
}

export type CellColor = { background: string; color: string };

/** Intensidade 0..1 da imagem de entrada, em tons de azul. */
export function inputColor(value: number): CellColor {
  const rgb = mix(SURFACE, hexToRgb(PALETTE.input), value);
  return { background: rgbToCss(rgb), color: readableText(rgb) };
}

/**
 * Valor com sinal (feature map). Negativos puxam para vermelho, positivos para
 * verde, e o zero fica neutro. `scale` normaliza a intensidade.
 */
export function signedColor(value: number, scale: number): CellColor {
  const magnitude = scale > 0 ? Math.abs(value) / scale : 0;
  const target = value < 0 ? PALETTE.negative : PALETTE.positive;
  const rgb = mix(SURFACE, hexToRgb(target), magnitude);
  return { background: rgbToCss(rgb), color: readableText(rgb) };
}

/** Igual ao `signedColor`, mas em violeta — usado na saída do pooling. */
export function poolColor(value: number, scale: number): CellColor {
  const magnitude = scale > 0 ? Math.abs(value) / scale : 0;
  const rgb = mix(SURFACE, hexToRgb(PALETTE.pool), magnitude);
  return { background: rgbToCss(rgb), color: readableText(rgb) };
}

/** Pesos do kernel: laranja para positivo, cinza-azulado para negativo. */
export function kernelColor(value: number, scale: number): CellColor {
  const magnitude = scale > 0 ? Math.abs(value) / scale : 0;
  const target = value < 0 ? "#60a5fa" : PALETTE.kernel;
  const rgb = mix(SURFACE, hexToRgb(target), magnitude * 0.9);
  return { background: rgbToCss(rgb), color: readableText(rgb) };
}

// ---------------------------------------------------------------------------
// Formatação numérica
// ---------------------------------------------------------------------------

export type ValueScale = "unit" | "byte";

/** Formata a intensidade da imagem em 0–1 ou 0–255. */
export function formatIntensity(value: number, scale: ValueScale): string {
  if (scale === "byte") return String(Math.round(value * 255));
  return value === 0 || value === 1 ? value.toFixed(0) : value.toFixed(2).replace(/0$/, "");
}

/** Formata resultados de convolução/pooling, escondendo casas decimais inúteis. */
export function formatSigned(value: number): string {
  if (Object.is(value, -0) || Math.abs(value) < 1e-9) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(Math.abs(value) < 10 ? 1 : 0);
}

/** Versão longa, usada nos painéis de cálculo detalhado. */
export function formatPrecise(value: number): string {
  if (Object.is(value, -0) || Math.abs(value) < 1e-9) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}
