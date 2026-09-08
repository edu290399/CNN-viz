"use client";

import { useMemo } from "react";
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
import { classify, computeDenseWeights, type Prediction } from "@/lib/classifier";

export type CnnPipeline = {
  conv: ConvResult;
  activated: Matrix;
  pool: PoolResult;
  flat: FlatEntry[];
  denseWeights: number[][];
  prediction: Prediction;
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
 * Como as camadas são encadeadas, uma alteração num pixel se propaga
 * imediatamente até a predição final.
 */
export function useCnnPipeline(input: Matrix, kernel: Matrix): CnnPipeline {
  return useMemo(() => {
    const conv = convolve2d(input, kernel);
    const activated = relu(conv.output);
    const pool = maxPool2d(activated, 2, 2);
    const flat = flatten(pool.output);
    const denseWeights = computeDenseWeights(kernel);
    const prediction = classify(pool.output, denseWeights);

    return {
      conv,
      activated,
      pool,
      flat,
      denseWeights,
      prediction,
      scales: {
        conv: maxAbs(conv.output) || 1,
        activated: maxAbs(activated) || 1,
        pool: maxAbs(pool.output) || 1,
        kernel: maxAbs(kernel) || 1,
      },
    };
  }, [input, kernel]);
}
