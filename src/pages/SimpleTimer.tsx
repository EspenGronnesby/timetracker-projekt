import { useState } from "react";
import { useSimpleTimer } from "@/hooks/useSimpleTimer";
import { formatDuration } from "@/lib/timeUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, Square, Coffee, UtensilsCrossed, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

const statusLabels: Record<string, string> = {
  ready: "Klar",
  working: "Jobber",
  paused: "Pause",
  done: "Ferdig for dagen",
};

const statusColors: Record<string, string> = {
  ready: "text-muted-foreground",
  working: "text-green-500",
  paused: "text-yellow-500",
  done: "text-primary",
};

const SimpleTimer = () => {
  const {
    isRunning,
    isPaused,
    status,
    currentSessionSeconds,
    todaySeconds,
    workSeconds,
    normalSeconds,
    overtimeSeconds,
    isOvertime,
    normalWage,
    overtimeWage,
    totalWage,
    rate,
    multiplier,
    activeBreak,
    startTimer,
    stopTimer,
    startBreak,
    endBreak,
    isStarting,
    isStopping,
  } = useSimpleTimer();

  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const navigate = useNavigate();

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(amount);

  const formatHoursMinutes = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}t ${m.toString().padStart(2, "0")}min`;
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-lg mx-auto">
      {/* Status */}
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("text-sm font-semibold uppercase tracking-widest", statusColors[status])}
      >
        {statusLabels[status]}
      </motion.div>

      {/* Main timer display */}
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "w-56 h-56 rounded-full border-4 flex items-center justify-center transition-colors",
            isRunning ? "border-green-500/50" : isPaused ? "border-yellow-500/50" : "border-border"
          )}
        >
          <span className="text-5xl font-mono font-bold tracking-tight tabular-nums">
            {formatDuration(activeBreak ? 0 : currentSessionSeconds)}
          </span>
        </div>
        {isOvertime && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-950 text-xs font-bold px-2 py-1 rounded-full"
          >
            OVERTID
          </motion.div>
        )}
      </div>

      {/* Pause timer */}
      <AnimatePresence>
        {isPaused && activeBreak && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-center"
          >
            <p className="text-sm text-muted-foreground mb-1">
              {activeBreak.break_type === "lunch_paid"
                ? "Lunsj (betalt)"
                : activeBreak.break_type === "lunch_unpaid"
                ? "Lunsj (ubetalt)"
                : "Kort pause"}
            </p>
            <p className="text-2xl font-mono tabular-nums text-yellow-500">
              {formatDuration(
                Math.floor((Date.now() - new Date(activeBreak.start_time).getTime()) / 1000)
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control buttons */}
      <div className="flex items-center gap-4">
        {status === "ready" || status === "done" ? (
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              onClick={() => startTimer()}
              disabled={isStarting}
              className="w-[120px] h-[120px] rounded-full text-lg gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg"
            >
              <Play className="h-10 w-10 fill-current" />
            </Button>
          </motion.div>
        ) : isPaused ? (
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              onClick={() => endBreak()}
              className="w-[120px] h-[120px] rounded-full text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg"
            >
              <Play className="h-10 w-10 fill-current" />
            </Button>
          </motion.div>
        ) : (
          <>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                onClick={() => setShowBreakDialog(true)}
                variant="outline"
                className="w-16 h-16 rounded-full"
              >
                <Pause className="h-7 w-7" />
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                onClick={() => stopTimer()}
                disabled={isStopping}
                className="w-[120px] h-[120px] rounded-full text-lg bg-red-600 hover:bg-red-700 text-white shadow-lg"
              >
                <Square className="h-10 w-10 fill-current" />
              </Button>
            </motion.div>
          </>
        )}
      </div>

      {/* Today summary */}
      <Card className="w-full p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Dagens arbeidstid</span>
          <span className="font-mono font-semibold tabular-nums">
            {formatHoursMinutes(todaySeconds)}
          </span>
        </div>

        {rate > 0 && (
          <>
            <div className="border-t border-border pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Normal: {formatHoursMinutes(normalSeconds)} × {formatMoney(rate)}
                </span>
                <span>{formatMoney(normalWage)}</span>
              </div>
              {overtimeSeconds > 0 && (
                <div className="flex justify-between text-sm text-yellow-500">
                  <span>
                    Overtid: {formatHoursMinutes(overtimeSeconds)} × {formatMoney(rate * multiplier)}
                  </span>
                  <span>{formatMoney(overtimeWage)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between font-semibold border-t border-border pt-2">
              <span>Estimert lønn</span>
              <span className={cn(isOvertime && "text-yellow-500")}>{formatMoney(totalWage)}</span>
            </div>
          </>
        )}

        {rate === 0 && (
          <button
            onClick={() => navigate("/simple/wage")}
            className="text-sm text-primary hover:underline"
          >
            Sett opp timesats for lønnsberegning →
          </button>
        )}
      </Card>

      {/* Break type selection dialog */}
      <AlertDialog open={showBreakDialog} onOpenChange={setShowBreakDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Velg pausetype</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="grid gap-3 mt-2">
            <Button
              variant="outline"
              className="h-14 justify-start gap-3 text-left"
              onClick={() => {
                startBreak({ breakType: "lunch_unpaid", isPaid: false });
                setShowBreakDialog(false);
              }}
            >
              <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Lunsj (ubetalt)</div>
                <div className="text-xs text-muted-foreground">Trekkes fra arbeidstid</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-14 justify-start gap-3 text-left"
              onClick={() => {
                startBreak({ breakType: "lunch_paid", isPaid: true });
                setShowBreakDialog(false);
              }}
            >
              <UtensilsCrossed className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Lunsj (betalt)</div>
                <div className="text-xs text-muted-foreground">Teller som arbeidstid</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-14 justify-start gap-3 text-left"
              onClick={() => {
                startBreak({ breakType: "short_break", isPaid: false });
                setShowBreakDialog(false);
              }}
            >
              <Coffee className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Kort pause</div>
                <div className="text-xs text-muted-foreground">Ubetalt kort pause</div>
              </div>
            </Button>
          </div>
          <Button variant="ghost" onClick={() => setShowBreakDialog(false)} className="mt-2">
            Avbryt
          </Button>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SimpleTimer;
