import { useState, useEffect } from "react";
import { Pause, Square, Play } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface PauseInterval {
  paused_at: string;
  resumed_at: string | null;
}

interface ActiveTimerBarProps {
  projectName: string;
  projectColor: string;
  startTime: string;
  isPaused: boolean;
  /** Fullførte og pågående pauseintervaller for denne tidsregistreringen */
  pauses?: PauseInterval[];
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

/**
 * Beregn totalt antall sekunder brukt i pauser.
 * Fullførte pauser: resumed_at - paused_at
 * Pågående pause: now - paused_at
 */
function totalPausedSeconds(pauses: PauseInterval[]): number {
  const now = Date.now();
  return pauses.reduce((sum, p) => {
    const start = new Date(p.paused_at).getTime();
    const end = p.resumed_at ? new Date(p.resumed_at).getTime() : now;
    return sum + Math.max(0, end - start);
  }, 0) / 1000;
}

export const ActiveTimerBar = ({
  projectName,
  projectColor,
  startTime,
  isPaused,
  pauses = [],
  onPause,
  onResume,
  onStop,
}: ActiveTimerBarProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => {
      const totalSec = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      const pausedSec = Math.floor(totalPausedSeconds(pauses));
      setElapsed(Math.max(0, totalSec - pausedSec));
    };
    update();

    // Oppdater hvert sekund selv under pause (pågående pause øker pausedSec)
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, isPaused, pauses]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div
      className="relative glass-card rounded-xl mx-4 mb-3 px-4 py-3 flex items-center gap-3 animate-fade-in overflow-hidden transition-shadow duration-200 hover:shadow-md"
      style={{
        // Subtil tint i venstre kant basert på prosjektets farge
        backgroundImage: `linear-gradient(to right, ${projectColor}14 0%, transparent 35%)`,
      }}
    >
      {/* Prosjekt-indikator med glow */}
      <div className="relative flex-shrink-0 flex items-center justify-center">
        {!isPaused && (
          <span
            aria-hidden
            className="absolute h-5 w-5 rounded-full opacity-50 animate-soft-glow motion-reduce:animate-none"
            style={{ backgroundColor: projectColor }}
          />
        )}
        <div
          className={`relative w-2.5 h-2.5 rounded-full ${isPaused ? "" : "animate-timer-pulse motion-reduce:animate-none"}`}
          style={{ backgroundColor: projectColor }}
        />
      </div>

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
            className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center pressable shadow-sm shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow"
            aria-label="Gjenoppta timer"
          >
            <Play className="h-3.5 w-3.5 text-white ml-0.5 fill-white" />
          </button>
        ) : (
          <button
            onClick={() => { onPause(); haptic("light"); }}
            className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center pressable shadow-sm shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-shadow"
            aria-label="Pause timer"
          >
            <Pause className="h-3.5 w-3.5 text-white" />
          </button>
        )}
        <button
          onClick={() => { onStop(); haptic("heavy"); }}
          className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center pressable hover:bg-red-500 hover:border-red-500 hover:text-white transition-colors"
          aria-label="Stopp timer"
        >
          <Square className="h-3 w-3 text-red-500" />
        </button>
      </div>
    </div>
  );
};
