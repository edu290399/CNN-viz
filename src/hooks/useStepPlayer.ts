"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type StepPlayer = {
  index: number;
  isPlaying: boolean;
  speed: number;
  total: number;
  setIndex: (index: number) => void;
  setSpeed: (speed: number) => void;
  toggle: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
};

/**
 * Controla um cursor que percorre os passos de uma operação (a janela do kernel
 * deslizando, por exemplo). Toca em loop e o índice é normalizado na renderização,
 * então mudar o número de passos nunca deixa o cursor fora de alcance.
 */
export function useStepPlayer(total: number, initialSpeed = 320): StepPlayer {
  const [rawIndex, setRawIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);

  const totalRef = useRef(total);
  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    if (!isPlaying || total === 0) return;
    const id = window.setInterval(() => {
      setRawIndex((current) => (current + 1) % total);
    }, speed);
    return () => window.clearInterval(id);
  }, [isPlaying, speed, total]);

  const setIndex = useCallback((value: number) => setRawIndex(value), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);

  const next = useCallback(() => {
    setIsPlaying(false);
    setRawIndex((current) => current + 1);
  }, []);

  const prev = useCallback(() => {
    setIsPlaying(false);
    setRawIndex((current) => current - 1 + totalRef.current);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setRawIndex(0);
  }, []);

  return {
    index: total > 0 ? ((rawIndex % total) + total) % total : 0,
    isPlaying,
    speed,
    total,
    setIndex,
    setSpeed,
    toggle,
    pause,
    next,
    prev,
    reset,
  };
}
