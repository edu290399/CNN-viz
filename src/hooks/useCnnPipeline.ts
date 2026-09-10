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
import { classify, trainDenseLayer, type DenseModel, type Prediction } from "@/lib/classifier";

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

/**
 * Recalcula todo o pipeline sempre que a imagem ou o kernel mudam.
 *
 * As camadas convolucionais são baratas e rodam a cada alteração. O treino da
 * camada densa custa ~150ms, então usa `useDeferredValue`: as matrizes e a
 * animação respondem na hora e a predição chega logo depois, sem travar a
 * digitação nos pesos do kernel.
 */
export function useCnnPipeline(input: Matrix, kernel: Matrix): CnnPipeline {
  const deferredKernel = useDeferredValue(kernel);
  const isTraining = deferredKernel !== kernel;

  const model = useMemo(() => trainDenseLayer(deferredKernel), [deferredKernel]);

  return useMemo(() => {
    const conv = convolve2d(input, kernel);
    const activated = relu(conv.output);
    const pool = maxPool2d(activated, 2, 2);
    const flat = flatten(pool.output);
    const prediction = classify(pool.output, model);

    return {
      conv,
      activated,
      pool,
      flat,
      model,
      prediction,
      isTraining,
      scales: {
        conv: maxAbs(conv.output) || 1,
        activated: maxAbs(activated) || 1,
        pool: maxAbs(pool.output) || 1,
        kernel: maxAbs(kernel) || 1,
      },
    };
  }, [input, kernel, model, isTraining]);
}
