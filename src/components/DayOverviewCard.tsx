/**
 * DayOverviewCard — merged view of today's activity timeline + time entries.
 * Combines the timeline events (start/pause/resume/stop) with the list of
 * completed entries, all in one modern card with delete/edit functionality.
 */
import { useState, useMemo } from "react";
import { startOfDay, endOfDay, isWithinInterval, isToday } from "date-fns";
import { Pencil, Trash2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { TimeEntry, TimeEntryPause, PauseType, Project } from "@/hooks/useProjects";

interface DayOverviewCardProps {
  timeEntries: TimeEntry[];
  timeEntryPauses: TimeEntryPause[];
  projects: Project[];
  userId: string;
  onDelete: (entryId: string) => Promise<unknown>;
  onUpdate: (input: {
    entryId: string;
    startTime: string;
    endTime: string;
  }) => void;
}

const PAUSE_LABELS: Record<PauseType, string> = {
  general: "Pause",
  breakfast: "Frokost",
  lunch: "Lunsj",
};

type DayEvent = {
  time: Date;
  label: string;
  type: "start" | "pause" | "resume" | "stop";
};

/**
 * Formaterer sekunder til "Xt Ym" format
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}t`;
  }
  return `${hours}t ${minutes}m`;
}

/**
 * Beregner overtid basert på seconds
 */
function getOvertimeRate(seconds: number): number | null {
  const DAILY_GOAL_SECONDS = 7.5 * 3600;
  const EIGHT_HOUR_SECONDS = 8 * 3600;

  if (seconds > DAILY_GOAL_SECONDS) {
    if (seconds >= EIGHT_HOUR_SECONDS) {
      return 100;
    }
    return 50;
  }
  return null;
}

export function DayOverviewCard({
  timeEntries,
  timeEntryPauses,
  projects,
  userId,
  onDelete,
  onUpdate,
}: DayOverviewCardProps) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // Filter today's entries and pauses
  const todayEntries = useMemo(
    () =>
      timeEntries.filter(
        (e) =>
          e.user_id === userId &&
          isWithinInterval(new Date(e.start_time), { start: todayStart, end: todayEnd })
      ),
    [timeEntries, userId, todayStart, todayEnd]
  );

  const todayPauses = useMemo(() => {
    const ids = todayEntries.map((e) => e.id);
    return timeEntryPauses.filter((p) => ids.includes(p.time_entry_id));
  }, [timeEntryPauses, todayEntries]);

  // Completed entries for the list (with end_time)
  const todayCompletedEntries = useMemo(() => {
    return todayEntries.filter((e) => e.end_time && isToday(new Date(e.start_time)));
  }, [todayEntries]);

  // Calculate total pause time
  const totalPauseSeconds = useMemo(() => {
    return todayPauses
      .filter((p) => p.resumed_at)
      .reduce(
        (acc, p) =>
          acc +
          Math.floor(
            (new Date(p.resumed_at!).getTime() - new Date(p.paused_at).getTime()) / 1000
          ),
        0
      );
  }, [todayPauses]);

  const pauseMinutes = Math.floor(totalPauseSeconds / 60);

  // Build timeline events
  const dayEvents = useMemo(() => {
    const events: DayEvent[] = [];

    for (const entry of todayEntries) {
      events.push({
        time: new Date(entry.start_time),
        label: "Startet arbeid",
        type: "start",
      });
      if (entry.end_time) {
        events.push({ time: new Date(entry.end_time), label: "Avsluttet", type: "stop" });
      }
    }

    for (const pause of todayPauses) {
      const label = PAUSE_LABELS[pause.pause_type as PauseType] || "Pause";
      events.push({ time: new Date(pause.paused_at), label, type: "pause" });
      if (pause.resumed_at) {
        events.push({
          time: new Date(pause.resumed_at),
          label: "Tilbake på jobb",
          type: "resume",
        });
      }
    }

    return events.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [todayEntries, todayPauses]);

  // Calculate total hours today
  const todayTotalSeconds = useMemo(() => {
    return todayCompletedEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
  }, [todayCompletedEntries]);

  const todayHours = (todayTotalSeconds / 3600).toFixed(1);

  // Edit/delete dialog state
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handlers
  const handleEditClick = (entry: TimeEntry) => {
    setEditingEntry(entry);
    const start = new Date(entry.start_time);
    const end = new Date(entry.end_time!);

    const startHours = String(start.getHours()).padStart(2, "0");
    const startMinutes = String(start.getMinutes()).padStart(2, "0");
    const endHours = String(end.getHours()).padStart(2, "0");
    const endMinutes = String(end.getMinutes()).padStart(2, "0");

    setEditStartTime(`${startHours}:${startMinutes}`);
    setEditEndTime(`${endHours}:${endMinutes}`);
  };

  const handleEditSave = () => {
    if (!editingEntry || !editStartTime || !editEndTime) return;

    const start = new Date(editingEntry.start_time);
    const [editStartHour, editStartMin] = editStartTime.split(":").map(Number);
    start.setHours(editStartHour, editStartMin, 0, 0);

    const end = new Date(editingEntry.start_time);
    const [editEndHour, editEndMin] = editEndTime.split(":").map(Number);
    end.setHours(editEndHour, editEndMin, 0, 0);

    onUpdate({
      entryId: editingEntry.id,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });

    setEditingEntry(null);
    setEditStartTime("");
    setEditEndTime("");
  };

  const handleDeleteClick = (entryId: string) => {
    setDeletingEntryId(entryId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEntryId) return;
    setIsDeleting(true);
    try {
      await onDelete(deletingEntryId);
      setDeletingEntryId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });

  // Empty state
  if (dayEvents.length === 0 && todayCompletedEntries.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <h3 className="text-caption uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            I dag
          </h3>
        </CardHeader>
        <CardContent>
          <div className="py-8 flex flex-col items-center justify-center">
            <Clock className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-caption text-muted-foreground">Ingen registreringer i dag</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-caption uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              I dag
            </h3>
            <div className="text-right">
              <p className="text-title font-semibold tabular-nums">{todayHours}t</p>
              {totalPauseSeconds > 0 && (
                <p className="text-caption text-yellow-500 tabular-nums mt-0.5">
                  {pauseMinutes} min pause
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Timeline of events */}
          {dayEvents.length > 0 && (
            <div className="space-y-0 border-b border-border/20 pb-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-medium">
                Tidssekvens
              </p>
              {dayEvents.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0"
                >
                  <span className="text-callout tabular-nums text-muted-foreground w-12 flex-shrink-0">
                    {fmtTime(event.time)}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      event.type === "start"
                        ? "bg-green-500"
                        : event.type === "pause"
                        ? "bg-yellow-500"
                        : event.type === "resume"
                        ? "bg-blue-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-callout">{event.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Entries list */}
          {todayCompletedEntries.length > 0 && (
            <div className="space-y-0">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-medium">
                Registreringer
              </p>
              {todayCompletedEntries.map((entry) => {
                const project = projects.find((p) => p.id === entry.project_id);
                const overtimeRate = getOvertimeRate(entry.duration_seconds);

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0"
                  >
                    {/* Project color dot */}
                    {project && (
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                    )}

                    {/* Project name + duration */}
                    <div className="flex-1 min-w-0">
                      <div className="text-callout font-medium truncate tracking-tight">
                        {project?.name || "Ukjent prosjekt"}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-caption text-muted-foreground tabular-nums leading-snug">
                          {formatDuration(entry.duration_seconds)}
                        </span>
                        {overtimeRate && (
                          <span
                            className={`text-caption font-medium leading-snug ${
                              overtimeRate === 100 ? "text-red-500" : "text-orange-500"
                            }`}
                          >
                            Overtid {overtimeRate}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={() => handleEditClick(entry)}
                      className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background flex-shrink-0"
                      aria-label="Rediger tidsregistrering"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteClick(entry.id)}
                      className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background flex-shrink-0"
                      aria-label="Slett tidsregistrering"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Rediger timer</DialogTitle>
            <DialogDescription>
              Endre start- og sluttidspunkt for denne registreringen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start-time" className="text-sm font-medium tracking-tight">
                Fra
              </Label>
              <Input
                id="edit-start-time"
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="text-center"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-end-time" className="text-sm font-medium tracking-tight">
                Til
              </Label>
              <Input
                id="edit-end-time"
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="text-center"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditingEntry(null)}
              className="w-full sm:w-auto active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={!editStartTime || !editEndTime}
              className="w-full sm:w-auto active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Lagre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingEntryId}
        onOpenChange={() => setDeletingEntryId(null)}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Slett registrering</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil slette denne tidsregistreringen? Dette
              kan ikke angres.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeletingEntryId(null)}
              disabled={isDeleting}
              className="w-full sm:w-auto active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-full sm:w-auto active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {isDeleting ? "Sletter..." : "Slett"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
