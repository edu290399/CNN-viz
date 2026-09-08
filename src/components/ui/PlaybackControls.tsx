"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import type { StepPlayer } from "@/hooks/useStepPlayer";

const SPEEDS = [
  { label: "0.5x", value: 640 },
  { label: "1x", value: 320 },
  { label: "2x", value: 150 },
  { label: "4x", value: 70 },
];

type PlaybackControlsProps = {
  player: StepPlayer;
  accent: string;
  /** Texto curto descrevendo o passo atual (ex.: "Posição 12 de 64"). */
  status?: string;
};

export default function PlaybackControls({
  player,
  accent,
  status,
}: PlaybackControlsProps) {
  const buttonClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 transition hover:border-slate-600 hover:text-slate-100 disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={player.toggle}
        className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-950 transition hover:brightness-110"
        style={{ backgroundColor: accent }}
      >
        {player.isPlaying ? <Pause size={15} /> : <Play size={15} />}
        {player.isPlaying ? "Pausar" : "Animar"}
      </button>

      <div className="flex items-center gap-1.5">
        <button type="button" onClick={player.prev} className={buttonClass} aria-label="Passo anterior">
          <ChevronLeft size={16} />
        </button>
        <button type="button" onClick={player.next} className={buttonClass} aria-label="Próximo passo">
          <ChevronRight size={16} />
        </button>
        <button type="button" onClick={player.reset} className={buttonClass} aria-label="Reiniciar">
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/70 p-0.5">
        {SPEEDS.map((speed) => (
          <button
            key={speed.label}
            type="button"
            onClick={() => player.setSpeed(speed.value)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition ${
              player.speed === speed.value
                ? "bg-slate-700 text-slate-100"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {speed.label}
          </button>
        ))}
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(player.total - 1, 0)}
        value={player.index}
        onChange={(e) => {
          player.pause();
          player.setIndex(Number(e.target.value));
        }}
        className="h-1 min-w-[120px] flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-current"
        style={{ color: accent }}
        aria-label="Posição da janela"
      />

      {status ? (
        <span className="font-mono text-xs text-slate-500">{status}</span>
      ) : null}
    </div>
  );
}
