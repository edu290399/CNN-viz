import {
  convolve2d,
  dot,
  maxPool2d,
  normalize,
  relu,
  softmax,
  type Matrix,
} from "./cnn";
import { CLASSES, getPattern } from "./patterns";

/**
 * Numa CNN real os pesos da camada densa vêm do treinamento. Aqui eles são
 * derivados dos próprios gabaritos: passamos cada padrão de referência pelo
 * mesmo pipeline (conv -> ReLU -> pool) e usamos o vetor resultante como
 * "assinatura" da classe. Subtrair a média entre as classes deixa os pesos
 * discriminativos — é, na prática, um classificador de centroide mais próximo.
 *
 * O efeito didático é o que importa: os pesos reagem ao kernel escolhido, então
 * fica visível que um bom filtro produz uma classificação melhor.
 */

export const DENSE_TEMPERATURE = 12;

/** Roda o pipeline completo e devolve o vetor achatado (flatten). */
export function featureVector(input: Matrix, kernel: Matrix): number[] {
  const { output } = convolve2d(input, kernel);
  const { output: pooled } = maxPool2d(relu(output));
  return pooled.flat();
}

/** Uma linha de pesos por classe de saída. */
export function computeDenseWeights(kernel: Matrix): number[][] {
  const signatures = CLASSES.map((c) =>
    normalize(featureVector(getPattern(c.patternId), kernel))
  );

  const length = signatures[0]?.length ?? 0;
  const mean = Array.from(
    { length },
    (_, i) => signatures.reduce((acc, v) => acc + v[i], 0) / signatures.length
  );

  return signatures.map((v) => v.map((x, i) => x - mean[i]));
}

export type Prediction = {
  scores: number[];
  probabilities: number[];
  winnerIndex: number;
};

export function classify(pooled: Matrix, weights: number[][]): Prediction {
  const x = normalize(pooled.flat());
  const scores = weights.map((w) => dot(w, x));
  const probabilities = softmax(scores, DENSE_TEMPERATURE);

  let winnerIndex = 0;
  probabilities.forEach((p, i) => {
    if (p > probabilities[winnerIndex]) winnerIndex = i;
  });

  return { scores, probabilities, winnerIndex };
}
