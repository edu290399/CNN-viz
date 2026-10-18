"use client";

import { useDeferredValue, useMemo } from "react";
import {
  convolve2d,
  flatten,
  maxAbs,
  maxPool2d,
  relu,
  type ConvResult,
  type FlatEntry,
  type Matrix,
  type PoolResult,
} from "@/lib/cnn";
import {
  classify,
  HIDDEN_UNITS,
  trainDenseLayer,
  type DenseModel,
  type Prediction,
} from "@/lib/classifier";
import { CLASSES } from "@/lib/patterns";

export type CnnPipeline = {
  conv: ConvResult;
  activated: Matrix;
  pool: PoolResult;
  flat: FlatEntry[];
  model: DenseModel;
  prediction: Prediction;
  /** `true` enquanto o modelo do kernel novo ainda está treinando. */
  isTraining: boolean;
  /** Escalas de normalização para colorir cada matriz de forma coerente. */
  scales: {
    conv: number;
    activated: number;
    pool: number;
    kernel: number;
  };
};

function placeholderPrediction(featureCount: number): Prediction {
  const n = CLASSES.length;
  return {
    features: Array.from({ length: featureCount }, () => 0),
    hiddenActivations: Array.from({ length: HIDDEN_UNITS }, () => 0),
    scores: Array.from({ length: n }, () => 0),
    probabilities: Array.from({ length: n }, () => 1 / n),
    winnerIndex: 0,
  };
}

/**
 * Recalcula todo o pipeline sempre que a imagem, o kernel ou o padding mudam.
 *
 * As camadas convolucionais são baratas e rodam a cada alteração. O treino da
 * camada densa custa ~150ms, então usa `useDeferredValue`: as matrizes e a
 * animação respondem na hora e a predição chega logo depois, sem travar a
 * digitação nos pesos do kernel.
 */
export function useCnnPipeline(
  input: Matrix,
  kernel: Matrix,
  padding = 0
): CnnPipeline {
  const deferredKernel = useDeferredValue(kernel);
  const deferredPadding = useDeferredValue(padding);

  const model = useMemo(
    () => trainDenseLayer(deferredKernel, undefined, deferredPadding),
    [deferredKernel, deferredPadding]
  );

  return useMemo(() => {
    const conv = convolve2d(input, kernel, padding);
    const activated = relu(conv.output);
    const pool = maxPool2d(activated, 2, 2);
    const flat = flatten(pool.output);
    const modelDim = model.hidden.weights[0]?.length ?? 0;
    const ready = modelDim === flat.length;
    const prediction = ready
      ? classify(pool.output, model)
      : placeholderPrediction(flat.length);

    return {
      conv,
      activated,
      pool,
      flat,
      model,
      prediction,
      isTraining: !ready || deferredKernel !== kernel || deferredPadding !== padding,
      scales: {
        conv: maxAbs(conv.output) || 1,
        activated: maxAbs(activated) || 1,
        pool: maxAbs(pool.output) || 1,
        kernel: maxAbs(kernel) || 1,
      },
    };
  }, [input, kernel, padding, model, deferredKernel, deferredPadding]);
}
