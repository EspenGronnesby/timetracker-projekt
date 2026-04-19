import { useState, useEffect, useMemo } from "react";
import { Project, TimeEntry, TimeEntryPause, PauseType } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Coffee, UtensilsCrossed, LogOut, Clock, Bell, BellOff, ClipboardList } from "lucide-react";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { haptic } from "@/lib/haptics";
import { PaperSheetDialog } from "@/components/PaperSheetDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { WeatherWidget } from "@/components/WeatherWidget";

interface LightDashboardProps {
  projects: Project[];
  timeEntries: TimeEntry[];
  timeEntryPauses: TimeEntryPause[];
  userId: string;
  userName: string;
  onToggleProject: (projectId: string) => void;
  onPauseTimer: (projectId: string, pauseType?: PauseType) => void;
  onResumeTimer: (projectId: string) => void;
  // Fase 4: Papirark-modus
  onAddManualEntry?: (input: {
    projectId: string | null;
    userName: string;
    startTime: Date;
    endTime: Date;
    comment?: string;
    isOvertime?: boolean;
    overtimeRate?: number | null;
    compMethod?: "money" | "avspasering" | null;
  }) => Promise<unknown>;
  /** Brukerens normaltid per dag for overtidsberegning (default 7.5) */
  normalHoursPerDay?: number;
  // Fase 5a.2: Standard arbeidsdag — styrer schedule-widget + paper sheet pre-fill
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  defaultBreakfastTime?: string | null;
  defaultLunchTime?: string | null;
  defaultBreakfastMin?: number | null;
  defaultLunchMin?: number | null;
}

const DAILY_GOAL_HOURS = 7.5;

const PAUSE_LABELS: Record<PauseType, string> = {
  general: "Pause",
  breakfast: "Frokost",
  lunch: "Lunsj",
};

// Fallback pausevarigheter (brukes når brukeren ikke har satt egne)
const DEFAULT_PAUSE_DURATION_MIN: Record<PauseType, number> = {
  breakfast: 20,
  lunch: 30,
  general: 15,
};

function sendBreakAlarm(label: string) {
  haptic("heavy");
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Pause ferdig", { body: `${label} er over — tid for å gå tilbake på jobb!`, icon: "/favicon.ico" });
  }
}

export const LightDashboard = ({
  projects,
  timeEntries,
  timeEntryPauses,
  userId,
  userName,
  onToggleProject,
  onPauseTimer,
  onResumeTimer,
  onAddManualEntry,
  normalHoursPerDay = 7.5,
  defaultStartTime,
  defaultEndTime,
  defaultBreakfastTime,
  defaultLunchTime,
  defaultBreakfastMin,
  defaultLunchMin,
}: LightDashboardProps) => {
  // Normaliser tider (Postgres time → "HH:MM")
  const startHHMM = (defaultStartTime ?? "07:00").slice(0, 5);
  const endHHMM = (defaultEndTime ?? "15:00").slice(0, 5);
  const bfHHMM = (defaultBreakfastTime ?? "09:00").slice(0, 5);
  const lunchHHMM = (defaultLunchTime ?? "11:30").slice(0, 5);
  const bfMin = defaultBreakfastMin ?? 20;
  const lunchMin = defaultLunchMin ?? 30;

  // Pausevarighet basert på brukerens innstillinger
  const PAUSE_DURATION_MIN: Record<PauseType, number> = {
    breakfast: bfMin,
    lunch: lunchMin,
    general: DEFAULT_PAUSE_DURATION_MIN.general,
  };
  // ─── State ───
  const activeEntry = useMemo(
    () => timeEntries.find((e) => e.user_id === userId && !e.end_time && !e.paused_at),
    [timeEntries, userId]
  );
  const pausedEntry = useMemo(
    () => timeEntries.find((e) => e.user_id === userId && !e.end_time && e.paused_at),
    [timeEntries, userId]
  );
  const runningEntry = activeEntry || pausedEntry;

  const activeProjects = useMemo(() => projects.filter((p) => !p.completed), [projects]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    if (runningEntry) {
      setSelectedProjectId(runningEntry.project_id);
    } else if (!selectedProjectId && activeProjects.length > 0) {
      setSelectedProjectId(activeProjects[0].id);
    }
  }, [runningEntry, activeProjects, selectedProjectId]);

  const selectedProject = activeProjects.find((p) => p.id === selectedProjectId);

  // ─── Live arbeidstid (oppdateres hvert sekund) ───
  const [liveSeconds, setLiveSeconds] = useState(0);

  useEffect(() => {
    if (!activeEntry) { setLiveSeconds(0); return; }
    const update = () => setLiveSeconds(Math.floor((Date.now() - new Date(activeEntry.start_time).getTime()) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  // ─── Dagens data ───
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const todayEntries = useMemo(
    () => timeEntries.filter((e) =>
      e.user_id === userId && e.end_time &&
      isWithinInterval(new Date(e.start_time), { start: todayStart, end: todayEnd })
    ),
    [timeEntries, userId, todayStart, todayEnd]
  );

  // Pauser for dagens aktive entry
  const todayPauses = useMemo(() => {
    const entryIds = [
      ...todayEntries.map((e) => e.id),
      ...(runningEntry ? [runningEntry.id] : []),
    ];
    return timeEntryPauses.filter((p) => entryIds.includes(p.time_entry_id));
  }, [timeEntryPauses, todayEntries, runningEntry]);

  // Total arbeidstid i dag (ferdige + aktiv)
  const completedSeconds = todayEntries.reduce((acc, e) => acc + e.duration_seconds, 0);
  const activeSeconds = activeEntry ? liveSeconds : 0;

  // Trekk fra pauser for aktiv entry (pauser som er resumed)
  const activePausedSeconds = useMemo(() => {
    if (!runningEntry) return 0;
    return todayPauses
      .filter((p) => p.time_entry_id === runningEntry.id && p.resumed_at)
      .reduce((acc, p) => {
        return acc + Math.floor((new Date(p.resumed_at!).getTime() - new Date(p.paused_at).getTime()) / 1000);
      }, 0);
  }, [todayPauses, runningEntry]);

  const todayWorkSeconds = completedSeconds + Math.max(0, activeSeconds - activePausedSeconds);

  const progressPercent = Math.min(100, (todayWorkSeconds / (DAILY_GOAL_HOURS * 3600)) * 100);

  const isActive = !!activeEntry && activeEntry.project_id === selectedProjectId;
  const isPaused = !!pausedEntry && pausedEntry.project_id === selectedProjectId;
  const isRunning = isActive || isPaused;

  // Nåværende pause-type
  const currentPause = useMemo(() => {
    if (!pausedEntry) return null;
    return todayPauses.find((p) => p.time_entry_id === pausedEntry.id && !p.resumed_at);
  }, [pausedEntry, todayPauses]);

  // ─── Break timer + alarm ───
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmFired, setAlarmFired] = useState(false);

  useEffect(() => {
    if (!currentPause) {
      setBreakElapsed(0);
      setAlarmFired(false);
      return;
    }
    const update = () => {
      const elapsed = Math.floor((Date.now() - new Date(currentPause.paused_at).getTime()) / 1000);
      setBreakElapsed(elapsed);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [currentPause]);

  // Alarm: send notification når pausen er over
  useEffect(() => {
    if (!currentPause || !alarmEnabled || alarmFired) return;
    const pauseType = (currentPause.pause_type as PauseType) || "general";
    const durationSec = PAUSE_DURATION_MIN[pauseType] * 60;
    if (breakElapsed >= durationSec) {
      setAlarmFired(true);
      sendBreakAlarm(PAUSE_LABELS[pauseType]);
    }
  }, [breakElapsed, currentPause, alarmEnabled, alarmFired]);

  // Be om notification-tillatelse ved første alarm-toggle
  const toggleAlarm = () => {
    if (!alarmEnabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setAlarmEnabled(!alarmEnabled);
  };

  const breakDurationMin = currentPause
    ? PAUSE_DURATION_MIN[(currentPause.pause_type as PauseType) || "general"]
    : 0;
  const breakRemainingSeconds = Math.max(0, breakDurationMin * 60 - breakElapsed);
  const breakRemainingMin = Math.ceil(breakRemainingSeconds / 60);
  const breakElapsedMin = Math.floor(breakElapsed / 60);
  const breakProgressPercent = breakDurationMin > 0 ? Math.min(100, (breakElapsed / (breakDurationMin * 60)) * 100) : 0;
  const breakOvertime = breakElapsed > breakDurationMin * 60;

  // Format arbeidstid
  const workH = Math.floor(todayWorkSeconds / 3600);
  const workM = Math.floor((todayWorkSeconds % 3600) / 60);

  const fmtTime = (d: Date) => d.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

  // ─── Dagens plan / nedtelling ───
  // Standard norsk arbeidsdag: frokost 09:00, lunsj 11:30, ferdig 15:00
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000); // oppdater hvert halvminutt
    return () => clearInterval(interval);
  }, []);

  type ScheduleItem = {
    label: string;
    time: string;
    hour: number;
    minute: number;
    icon: "coffee" | "lunch" | "end";
    done: boolean;
    usedMin?: number;
  };

  const schedule: ScheduleItem[] = useMemo(() => {
    const parse = (hhmm: string) => {
      const [h, m] = hhmm.split(":").map(Number);
      return { h: Number.isNaN(h) ? 0 : h, m: Number.isNaN(m) ? 0 : m };
    };
    const bf = parse(bfHHMM);
    const lu = parse(lunchHHMM);
    const en = parse(endHHMM);

    const items: ScheduleItem[] = [
      { label: "Frokost", time: bfHHMM, hour: bf.h, minute: bf.m, icon: "coffee", done: false },
      { label: "Lunsj", time: lunchHHMM, hour: lu.h, minute: lu.m, icon: "lunch", done: false },
      { label: "Ferdig", time: endHHMM, hour: en.h, minute: en.m, icon: "end", done: false },
    ];

    // Beregn brukt tid per pausetype (kun fullførte pauser)
    const sumPauseMin = (type: PauseType) => {
      const totalSec = todayPauses
        .filter((p) => p.pause_type === type && p.resumed_at)
        .reduce((acc, p) => {
          const start = new Date(p.paused_at).getTime();
          const end = new Date(p.resumed_at!).getTime();
          return acc + Math.max(0, Math.floor((end - start) / 1000));
        }, 0);
      return Math.round(totalSec / 60);
    };

    const bfUsed = sumPauseMin("breakfast");
    const luUsed = sumPauseMin("lunch");

    // Sjekk hvilke pauser som er tatt (inkl. fullførte og aktive)
    const hasTakenBreakfast = todayPauses.some((p) => p.pause_type === "breakfast");
    const hasTakenLunch = todayPauses.some((p) => p.pause_type === "lunch");
    const dayEnded = !isRunning && todayEntries.length > 0;

    if (hasTakenBreakfast) {
      items[0].done = true;
      if (bfUsed > 0) items[0].usedMin = bfUsed;
    }
    if (hasTakenLunch) {
      items[1].done = true;
      if (luUsed > 0) items[1].usedMin = luUsed;
    }
    if (dayEnded) items[2].done = true;

    return items;
  }, [todayPauses, isRunning, todayEntries.length, bfHHMM, lunchHHMM, endHHMM]);

  const getCountdown = (hour: number, minute: number): string | null => {
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `om ${diffMin} min`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m > 0 ? `om ${h}t ${m}m` : `om ${h}t`;
  };

  const nextItem = schedule.find((item) => !item.done && getCountdown(item.hour, item.minute) !== null);

  return (
    <div className={`flex flex-col min-h-[calc(100dvh-8rem)] px-4 sm:px-6 max-w-lg mx-auto animate-fade-in ${isActive ? "pt-2" : "pt-6"}`}>

      {/* ─── Vær (gated på show_weather_widget i profile) ─── */}
      <WeatherWidget />

      {/* ─── Prosjekt ─── */}
      {activeProjects.length <= 1 ? (
        <div className="flex items-center justify-center gap-2.5 py-2 min-h-[44px]">
          {selectedProject && (
            <div className="w-3 h-3 rounded-full ring-2 ring-background" style={{ backgroundColor: selectedProject.color }} />
          )}
          <span className="text-base font-medium tracking-tight">{selectedProject?.name || "Ingen prosjekter"}</span>
        </div>
      ) : (
        <div className="flex justify-center py-1">
          <Popover>
            <PopoverTrigger asChild>
              <button
                disabled={isRunning}
                className="flex items-center gap-2.5 px-4 py-2.5 min-h-[44px] rounded-full hover:bg-muted/50 active:bg-muted/70 transition-colors duration-150 disabled:opacity-100 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {selectedProject && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-background"
                    style={{ backgroundColor: selectedProject.color }}
                  />
                )}
                <span className="text-base font-medium tracking-tight">
                  {selectedProject?.name || "Velg prosjekt"}
                </span>
                {!isRunning && (
                  <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-64 p-2">
              <div className="space-y-0.5 max-h-72 overflow-y-auto">
                {activeProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      haptic("light");
                    }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-colors ${
                      project.id === selectedProjectId
                        ? "bg-primary/10 font-semibold"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="text-sm truncate">{project.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* ─── Hero: Pause eller Arbeidstid ─── */}
      {isPaused && currentPause ? (
        // PAUSE-HERO — tar over hovedvisningen
        <div className="flex flex-col items-center py-10 sm:py-12 animate-fade-in">
          {/* Label + alarm-bjelle */}
          <div className="flex items-center gap-2 mb-2">
            {currentPause.pause_type === "breakfast" && <Coffee className="h-4 w-4 text-amber-600" />}
            {currentPause.pause_type === "lunch" && <UtensilsCrossed className="h-4 w-4 text-orange-500" />}
            {(currentPause.pause_type === "general" || !currentPause.pause_type) && <Pause className="h-4 w-4 text-yellow-500" />}
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
              {PAUSE_LABELS[(currentPause.pause_type as PauseType) || "general"]}
            </p>
            <button
              onClick={toggleAlarm}
              aria-label={alarmEnabled ? "Slå av alarm" : "Slå på alarm"}
              className="ml-1 p-1 rounded-full hover:bg-muted/60 active:scale-[0.96] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {alarmEnabled ? (
                <Bell className="h-3.5 w-3.5 text-primary" />
              ) : (
                <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Stor nedtelling */}
          <div className={`text-6xl sm:text-7xl font-bold tabular-nums tracking-tighter leading-none ${breakOvertime ? "text-red-500" : "text-yellow-500"}`}>
            {breakOvertime ? `+${breakElapsedMin - breakDurationMin}` : breakRemainingMin}
            <span className="text-2xl sm:text-3xl font-semibold ml-1 text-muted-foreground/60">min</span>
          </div>

          {/* Progress */}
          <div className="w-full max-w-[280px] mt-6 mb-1">
            <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none ${
                  breakOvertime ? "bg-red-500" : "bg-yellow-500"
                }`}
                style={{ width: `${breakProgressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-muted-foreground/80 tabular-nums">
              <span>{breakElapsedMin} min brukt</span>
              <span>{breakDurationMin} min total</span>
            </div>
          </div>

          {/* Status */}
          <div className="mt-3 min-h-[20px]">
            {breakOvertime ? (
              <p className="text-sm text-red-500 font-semibold">Overtid — på tide å komme tilbake</p>
            ) : alarmEnabled && !alarmFired ? (
              <p className="text-sm text-muted-foreground">Alarm om {breakRemainingMin} min</p>
            ) : (
              <p className="text-sm text-muted-foreground">Alarm av</p>
            )}
          </div>
        </div>
      ) : (
        <div className={`flex flex-col items-center ${isActive ? "py-5 sm:py-6" : "py-10 sm:py-12"}`}>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80 mb-2">
            Arbeidstid i dag
          </p>
          <div className={`font-bold tabular-nums tracking-tighter leading-none ${isActive ? "text-5xl sm:text-6xl" : "text-6xl sm:text-7xl"}`}>
            {workH}<span className="text-muted-foreground/40">:</span>{workM.toString().padStart(2, "0")}
          </div>

          {/* Progress */}
          <div className={`w-full max-w-[280px] mb-1 ${isActive ? "mt-4" : "mt-6"}`}>
            <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/90 transition-[width] duration-700 ease-out motion-reduce:transition-none shadow-sm shadow-primary/20"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-muted-foreground/80 tabular-nums">
              <span>{workH}t {workM}m arbeid</span>
              <span>{DAILY_GOAL_HOURS}t mål</span>
            </div>
          </div>

          {/* Status */}
          <div className={`min-h-[20px] ${isActive ? "mt-2" : "mt-3"}`}>
            {isActive && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-timer-pulse motion-reduce:animate-none" />
                <p className="text-xs text-green-700 dark:text-green-400 font-semibold">
                  På jobb siden {fmtTime(new Date(activeEntry!.start_time))}
                </p>
              </div>
            )}
            {!isRunning && todayEntries.length === 0 && (
              <p className="text-sm text-muted-foreground">Klar til å starte dagen</p>
            )}
            {!isRunning && todayEntries.length > 0 && (
              <p className="text-sm text-muted-foreground">Dagen er avsluttet</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Dagens plan (nedtelling) ─── */}
      {isRunning && (
        <div className={`flex items-center justify-center gap-8 ${isActive ? "pb-4" : "pb-6"}`}>
          {schedule.map((item) => {
            const countdown = getCountdown(item.hour, item.minute);
            const isCurrent = nextItem === item;
            const isActiveNow =
              isPaused &&
              ((item.icon === "coffee" && currentPause?.pause_type === "breakfast") ||
                (item.icon === "lunch" && currentPause?.pause_type === "lunch"));
            return (
              <div
                key={item.label}
                className={`flex flex-col items-center gap-1.5 transition-opacity duration-300 ${
                  item.done && !isActiveNow ? "opacity-35" : ""
                }`}
              >
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200 ${
                  isActiveNow
                    ? "bg-yellow-500/10"
                    : item.done
                    ? "bg-muted/60"
                    : isCurrent
                    ? "bg-primary/10 ring-2 ring-primary/40"
                    : "bg-muted/40"
                }`}>
                  {isActiveNow && (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full ring-2 ring-yellow-500/70 animate-soft-glow motion-reduce:animate-none motion-reduce:opacity-70"
                    />
                  )}
                  {item.icon === "coffee" && <Coffee className={`h-[18px] w-[18px] relative ${isActiveNow ? "text-yellow-600" : isCurrent ? "text-primary" : "text-muted-foreground"}`} />}
                  {item.icon === "lunch" && <UtensilsCrossed className={`h-[18px] w-[18px] relative ${isActiveNow ? "text-yellow-600" : isCurrent ? "text-primary" : "text-muted-foreground"}`} />}
                  {item.icon === "end" && <LogOut className={`h-[18px] w-[18px] relative ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />}
                </div>
                <span className="text-[12px] font-semibold tabular-nums tracking-tight">{item.time}</span>
                {isActiveNow ? (
                  <span className="text-[10px] text-yellow-600 font-semibold">Pågår</span>
                ) : item.done && item.usedMin !== undefined ? (
                  <span className="text-[10px] text-muted-foreground font-semibold tabular-nums">
                    {item.usedMin} min brukt
                  </span>
                ) : item.done ? (
                  <span className="text-[10px] text-muted-foreground/70 line-through">{item.label}</span>
                ) : countdown ? (
                  <span className={`text-[10px] tabular-nums ${isCurrent ? "text-primary font-semibold" : "text-muted-foreground/80"}`}>
                    {countdown}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/70">Passert</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Handlinger ─── */}
      <div className={`flex flex-col items-center ${isActive ? "gap-2 pb-3" : "gap-3 pb-6"}`}>
        {/* Hovedknapp */}
        {isActive ? (
          // PÅ JOBB → vis pause-valg (kompakt så alt synes uten scroll)
          <div className="flex flex-col items-center gap-2 w-full max-w-xs">
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => { onPauseTimer(selectedProjectId, "breakfast"); haptic("medium"); }}
                variant="outline"
                className="flex-1 h-12 rounded-2xl pressable gap-2 text-sm"
              >
                <Coffee className="h-4 w-4 text-amber-600" />
                Frokost
              </Button>
              <Button
                onClick={() => { onPauseTimer(selectedProjectId, "lunch"); haptic("medium"); }}
                variant="outline"
                className="flex-1 h-12 rounded-2xl pressable gap-2 text-sm"
              >
                <UtensilsCrossed className="h-4 w-4 text-orange-500" />
                Lunsj
              </Button>
            </div>
            <Button
              onClick={() => { onPauseTimer(selectedProjectId, "general"); haptic("light"); }}
              variant="outline"
              className="w-full h-11 rounded-2xl pressable gap-2 text-sm"
            >
              <Pause className="h-4 w-4" />
              Annen pause
            </Button>
            <Button
              onClick={() => { onToggleProject(selectedProjectId); haptic("heavy"); }}
              variant="outline"
              className="w-full h-11 rounded-2xl pressable gap-2 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white text-sm"
            >
              <LogOut className="h-4 w-4" />
              Avslutt dagen
            </Button>
          </div>
        ) : isPaused ? (
          // PÅ PAUSE → pause-info er i hero, her vises kun gjenoppta + avslutt
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <button
              onClick={() => { onResumeTimer(selectedProjectId); haptic("medium"); }}
              className="w-full h-16 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-[0.98] flex items-center justify-center gap-3 transition-all duration-150 shadow-lg shadow-green-500/25 text-white text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <Play className="h-6 w-6 fill-white" />
              Tilbake på jobb
            </button>
            <Button
              onClick={() => { onToggleProject(selectedProjectId); haptic("heavy"); }}
              variant="outline"
              className="w-full h-12 rounded-2xl pressable gap-2 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Avslutt dagen
            </Button>
          </div>
        ) : (
          // IKKE STARTET → start dagen
          <button
            onClick={() => { if (selectedProjectId) { onToggleProject(selectedProjectId); haptic("heavy"); } }}
            disabled={!selectedProjectId}
            className="w-full max-w-xs h-16 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-[0.98] disabled:opacity-30 disabled:active:scale-100 flex items-center justify-center gap-3 transition-all duration-150 shadow-lg shadow-green-500/25 text-white text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <Play className="h-6 w-6 fill-white" />
            Start arbeidsdagen
          </button>
        )}

        {/* Fase 4: Papirark — diskret alternativ inngang */}
        {onAddManualEntry && !isRunning && (
          <PaperSheetDialog
            projects={projects}
            userName={userName}
            normalHoursPerDay={normalHoursPerDay}
            defaultStartTime={startHHMM}
            defaultEndTime={endHHMM}
            defaultLunchMin={lunchMin}
            onSubmit={(input) => onAddManualEntry({ ...input, userName })}
            trigger={
              <Button
                variant="outline"
                className="w-full max-w-xs h-14 rounded-2xl pressable gap-2 text-base font-semibold mt-2"
              >
                <ClipboardList className="h-5 w-5" />
                Skriv inn timer
              </Button>
            }
          />
        )}
      </div>

    </div>
  );
};
