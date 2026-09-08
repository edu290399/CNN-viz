/**
 * Núcleo matemático da aplicação.
 *
 * Todas as funções são puras e retornam, além do resultado, a lista de "passos"
 * intermediários — é isso que permite animar cada operação célula a célula.
 */

export type Matrix = number[][];

export function createMatrix(rows: number, cols: number, fill = 0): Matrix {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

export function cloneMatrix(m: Matrix): Matrix {
  return m.map((row) => [...row]);
}

export function matrixShape(m: Matrix): { rows: number; cols: number } {
  return { rows: m.length, cols: m[0]?.length ?? 0 };
}

export function maxAbs(m: Matrix): number {
  let max = 0;
  for (const row of m) for (const v of row) max = Math.max(max, Math.abs(v));
  return max;
}

/** Converte uma "arte ASCII" em matriz numérica: `#` vira 1, qualquer outro caractere vira 0. */
export function fromAscii(rows: string[]): Matrix {
  return rows.map((row) => [...row].map((ch) => (ch === "#" ? 1 : 0)));
}

// ---------------------------------------------------------------------------
// Convolução
// ---------------------------------------------------------------------------

export type ConvStep = {
  index: number;
  /** Coordenada da célula gerada no feature map. */
  outRow: number;
  outCol: number;
  /** Canto superior esquerdo da janela sobre a matriz de entrada. */
  inRow: number;
  inCol: number;
  /** Submatriz da entrada coberta pelo kernel. */
  patch: Matrix;
  /** Produto elemento a elemento entre `patch` e o kernel. */
  products: Matrix;
  /** Soma de todos os produtos — o valor final da célula de saída. */
  sum: number;
};

export type ConvResult = {
  output: Matrix;
  steps: ConvStep[];
};

/** Convolução 2D com stride 1 e sem padding (saída encolhe em `kernel - 1`). */
export function convolve2d(input: Matrix, kernel: Matrix): ConvResult {
  const { rows: inRows, cols: inCols } = matrixShape(input);
  const { rows: kRows, cols: kCols } = matrixShape(kernel);

  const outRows = inRows - kRows + 1;
  const outCols = inCols - kCols + 1;

  const output = createMatrix(Math.max(outRows, 0), Math.max(outCols, 0));
  const steps: ConvStep[] = [];

  for (let r = 0; r < outRows; r++) {
    for (let c = 0; c < outCols; c++) {
      const patch = createMatrix(kRows, kCols);
      const products = createMatrix(kRows, kCols);
      let sum = 0;

      for (let kr = 0; kr < kRows; kr++) {
        for (let kc = 0; kc < kCols; kc++) {
          const value = input[r + kr][c + kc];
          const product = value * kernel[kr][kc];
          patch[kr][kc] = value;
          products[kr][kc] = product;
          sum += product;
        }
      }

      output[r][c] = sum;
      steps.push({
        index: steps.length,
        outRow: r,
        outCol: c,
        inRow: r,
        inCol: c,
        patch,
        products,
        sum,
      });
    }
  }

  return { output, steps };
}

// ---------------------------------------------------------------------------
// ReLU
// ---------------------------------------------------------------------------

export function relu(m: Matrix): Matrix {
  return m.map((row) => row.map((v) => Math.max(0, v)));
}

/** Quantos valores foram zerados pelo ReLU. */
export function countClipped(m: Matrix): number {
  return m.reduce((acc, row) => acc + row.filter((v) => v < 0).length, 0);
}

// ---------------------------------------------------------------------------
// Max Pooling
// ---------------------------------------------------------------------------

export type PoolStep = {
  index: number;
  outRow: number;
  outCol: number;
  inRow: number;
  inCol: number;
  /** Os 4 valores (2x2) analisados nesta janela. */
  window: Matrix;
  max: number;
  /** Offset do vencedor dentro da janela. */
  maxOffsetRow: number;
  maxOffsetCol: number;
};

export type PoolResult = {
  output: Matrix;
  steps: PoolStep[];
};

export function maxPool2d(input: Matrix, size = 2, stride = 2): PoolResult {
  const { rows: inRows, cols: inCols } = matrixShape(input);

  const outRows = Math.floor((inRows - size) / stride) + 1;
  const outCols = Math.floor((inCols - size) / stride) + 1;

  const output = createMatrix(Math.max(outRows, 0), Math.max(outCols, 0));
  const steps: PoolStep[] = [];

  for (let r = 0; r < outRows; r++) {
    for (let c = 0; c < outCols; c++) {
      const inRow = r * stride;
      const inCol = c * stride;
      const window = createMatrix(size, size);

      let max = -Infinity;
      let maxOffsetRow = 0;
      let maxOffsetCol = 0;

      for (let wr = 0; wr < size; wr++) {
        for (let wc = 0; wc < size; wc++) {
          const value = input[inRow + wr][inCol + wc];
          window[wr][wc] = value;
          if (value > max) {
            max = value;
            maxOffsetRow = wr;
            maxOffsetCol = wc;
          }
        }
      }

      output[r][c] = max;
      steps.push({
        index: steps.length,
        outRow: r,
        outCol: c,
        inRow,
        inCol,
        window,
        max,
        maxOffsetRow,
        maxOffsetCol,
      });
    }
  }

  return { output, steps };
}

// ---------------------------------------------------------------------------
// Flatten + camada densa
// ---------------------------------------------------------------------------

export type FlatEntry = {
  index: number;
  row: number;
  col: number;
  value: number;
};

/** Desenrola a matriz em vetor 1D, preservando a origem de cada elemento. */
export function flatten(m: Matrix): FlatEntry[] {
  const entries: FlatEntry[] = [];
  m.forEach((row, r) =>
    row.forEach((value, c) => {
      entries.push({ index: entries.length, row: r, col: c, value });
    })
  );
  return entries;
}

export function dot(a: number[], b: number[]): number {
  return a.reduce((acc, v, i) => acc + v * (b[i] ?? 0), 0);
}

export function norm(v: number[]): number {
  return Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
}

export function normalize(v: number[]): number[] {
  const n = norm(v);
  return n < 1e-9 ? v.map(() => 0) : v.map((x) => x / n);
}

export function softmax(scores: number[], temperature = 1): number[] {
  const scaled = scores.map((s) => s * temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return total === 0 ? scores.map(() => 1 / scores.length) : exps.map((e) => e / total);
}
