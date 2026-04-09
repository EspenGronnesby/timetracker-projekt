import { useState, useEffect } from "react";
import { Pause, Square, Play } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface ActiveTimerBarProps {
  projectName: string;
  projectColor: string;
  startTime: string;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const ActiveTimerBar = ({
  projectName,
  projectColor,
  startTime,
  isPaused,
  onPause,
  onResume,
  onStop,
}: ActiveTimerBarProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isPaused) return;

    const update = () => {
      setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, isPaused]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="glass-card rounded-xl mx-4 mb-3 px-4 py-3 flex items-center gap-3 animate-fade-in">
      {/* Prosjekt-indikator */}
      <div
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPaused ? "" : "animate-timer-pulse"}`}
        style={{ backgroundColor: projectColor }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{projectName}</p>
      </div>

      {/* Timer */}
      <span className="text-sm font-mono font-semibold tabular-nums tracking-tight">
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>

      {/* Knapper */}
      <div className="flex items-center gap-1.5">
        {isPaused ? (
          <button
            onClick={() => { onResume(); haptic("medium"); }}
            className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center pressable"
          >
            <Play className="h-3.5 w-3.5 text-white ml-0.5" />
          </button>
        ) : (
          <button
            onClick={() => { onPause(); haptic("light"); }}
            className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center pressable"
          >
            <Pause className="h-3.5 w-3.5 text-white" />
          </button>
        )}
        <button
          onClick={() => { onStop(); haptic("heavy"); }}
          className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center pressable hover:bg-red-500 hover:text-white transition-colors"
        >
          <Square className="h-3 w-3 text-red-500" />
        </button>
      </div>
    </div>
  );
};
