import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects, PauseType, TimeEntry } from "@/hooks/useProjects";

/**
 * Fase 6: Automatisk tidsplan.
 *
 * Kjører en timer i appen som automatisk starter arbeidsdagen, går i pause
 * (frokost + lunsj), gjenopptar arbeidet og avslutter dagen basert på
 * profile.default_*_time. Manuell kontroll fortsetter å fungere — scheduleren
 * sjekker timer-state før den handler, og bruker localStorage for idempotens
 * per dag og event (trygt mot flere åpne faner).
 *
 * Krever at profile.auto_schedule_enabled er true. Fungerer kun mandag-fredag
 * i v1. Fungerer kun mens appen er åpen — full bakgrunns-kjøring er fase 2.
 */

type EventName =
  | "start"
  | "breakfast_start"
  | "breakfast_end"
  | "lunch_start"
  | "lunch_end"
  | "end";

interface ScheduledEvent {
  name: EventName;
  date: Date;
}

const TOLERANCE_MIN = 5; // utløs event innen 5 minutter etter planlagt tid
const POLL_INTERVAL_MS = 30_000; // sjekk hvert 30. sekund

function parseHHMM(value: string | null | undefined): { h: number; m: number } | null {
  if (!value) return null;
  const [h, m] = value.slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function storageKey(userId: string, eventName: EventName, date: Date): string {
  return `auto_schedule_fired_${userId}_${formatDateKey(date)}_${eventName}`;
}

function hasFired(userId: string, eventName: EventName, date: Date): boolean {
  return localStorage.getItem(storageKey(userId, eventName, date)) === "1";
}

function markFired(userId: string, eventName: EventName, date: Date) {
  localStorage.setItem(storageKey(userId, eventName, date), "1");
}

/**
 * Returnerer prosjekt-ID å bruke for auto-schedule. Bruker det sist aktive
 * prosjektet (siste time_entry) eller første aktive prosjekt som fallback.
 */
function pickDefaultProjectId(
  projects: { id: string; completed: boolean }[],
  timeEntries: TimeEntry[],
  userId: string
): string | null {
  const myEntries = timeEntries
    .filter((e) => e.user_id === userId)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  const lastProjectId = myEntries[0]?.project_id;
  if (lastProjectId && projects.some((p) => p.id === lastProjectId && !p.completed)) {
    return lastProjectId;
  }
  const firstActive = projects.find((p) => !p.completed);
  return firstActive?.id ?? null;
}

export function useAutoScheduler() {
  const { user, profile } = useAuth();
  const {
    projects,
    timeEntries,
    toggleProject,
    pauseTimer,
    resumeTimer,
  } = useProjects();

  // Bruk refs så intervallet alltid ser siste state uten å re-mounte
  const stateRef = useRef({ user, profile, projects, timeEntries });
  stateRef.current = { user, profile, projects, timeEntries };

  useEffect(() => {
    if (!profile?.auto_schedule_enabled) return;

    const tick = () => {
      const { user, profile, projects, timeEntries } = stateRef.current;
      if (!user || !profile?.auto_schedule_enabled) return;

      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = søndag, 1-5 = man-fre, 6 = lørdag
      if (dayOfWeek === 0 || dayOfWeek === 6) return; // kun man-fre i v1

      // Bygg dagens event-timeline fra profil-feltene
      const start = parseHHMM(profile.default_start_time);
      const end = parseHHMM(profile.default_end_time);
      if (!start || !end) return; // minimum start+slutt må være satt

      const bf = parseHHMM(profile.default_breakfast_time);
      const lu = parseHHMM(profile.default_lunch_time);
      const bfMin = profile.default_breakfast_min ?? 0;
      const luMin = profile.default_lunch_min ?? 0;

      const at = (h: number, m: number) => {
        const d = new Date(now);
        d.setHours(h, m, 0, 0);
        return d;
      };

      const events: ScheduledEvent[] = [
        { name: "start", date: at(start.h, start.m) },
      ];
      if (bf && bfMin > 0) {
        events.push({ name: "breakfast_start", date: at(bf.h, bf.m) });
        events.push({ name: "breakfast_end", date: addMinutes(at(bf.h, bf.m), bfMin) });
      }
      if (lu && luMin > 0) {
        events.push({ name: "lunch_start", date: at(lu.h, lu.m) });
        events.push({ name: "lunch_end", date: addMinutes(at(lu.h, lu.m), luMin) });
      }
      events.push({ name: "end", date: at(end.h, end.m) });

      // Finn første event som er "in window" (passert, men ikke mer enn toleranse)
      // og ikke allerede fyrt. Idempotens via localStorage.
      const inWindow = events.filter((e) => {
        const elapsed = now.getTime() - e.date.getTime();
        return elapsed >= 0 && elapsed < TOLERANCE_MIN * 60_000 && !hasFired(user.id, e.name, now);
      });
      if (inWindow.length === 0) return;

      // Finn nåværende timer-state
      const activeEntry = timeEntries.find(
        (e) => e.user_id === user.id && !e.end_time && !e.paused_at
      );
      const pausedEntry = timeEntries.find(
        (e) => e.user_id === user.id && !e.end_time && e.paused_at
      );
      const runningEntry = activeEntry ?? pausedEntry;

      for (const ev of inWindow) {
        // Read-then-write for multi-tab-safety
        if (hasFired(user.id, ev.name, now)) continue;
        markFired(user.id, ev.name, now);

        switch (ev.name) {
          case "start": {
            if (runningEntry) break; // noe kjører allerede — ikke start
            const projectId = pickDefaultProjectId(projects, timeEntries, user.id);
            if (!projectId || !profile.name) break;
            toggleProject({ projectId, userName: profile.name });
            break;
          }
          case "breakfast_start":
          case "lunch_start": {
            if (!activeEntry) break; // kun hvis aktiv og ikke allerede pauset
            const type: PauseType = ev.name === "breakfast_start" ? "breakfast" : "lunch";
            pauseTimer({ projectId: activeEntry.project_id, pauseType: type });
            break;
          }
          case "breakfast_end":
          case "lunch_end": {
            if (!pausedEntry) break; // kun hvis pauset
            resumeTimer({ projectId: pausedEntry.project_id });
            break;
          }
          case "end": {
            if (!runningEntry || !profile.name) break;
            toggleProject({ projectId: runningEntry.project_id, userName: profile.name });
            break;
          }
        }
      }
    };

    tick(); // kjør en gang umiddelbart
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [
    profile?.auto_schedule_enabled,
    // Re-mount hvis tider endres (så vi bygger timeline på nytt)
    profile?.default_start_time,
    profile?.default_end_time,
    profile?.default_breakfast_time,
    profile?.default_lunch_time,
    profile?.default_breakfast_min,
    profile?.default_lunch_min,
    toggleProject,
    pauseTimer,
    resumeTimer,
  ]);
}
