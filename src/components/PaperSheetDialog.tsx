/**
 * PaperSheetDialog (Fase 4 — minimalistisk)
 * ─────────────────────────────────────────
 * Papirark-modus: alternativ inngang for å føre timer i etterkant.
 *
 * Designprinsipp: én ting på skjermen om gangen.
 *   • Default = stort tallfelt + Lagre. Dato = "I dag" (tap for å endre).
 *   • "Flere valg" gjemmer prosjekt, kommentar, fra-til-modus.
 *
 * To moduser:
 *   • Dag — én linje for valgt dato
 *   • Uke — kort liste med 7 felter (man-søn)
 */

import { useMemo, useState } from "react";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { Project } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const NO_PROJECT_VALUE = "__none__";

interface PaperSheetDialogProps {
  projects: Project[];
  userName: string;
  /** Brukerens normale arbeidstid per dag (default 7.5). Brukes for overtidsforslag. */
  normalHoursPerDay?: number;
  /** Standard arbeidsdag — pre-utfyller fra-til + lunsj. */
  defaultStartTime?: string | null;     // "07:00"
  defaultEndTime?: string | null;       // "15:00"
  defaultLunchMin?: number | null;      // 30
  onSubmit: (input: {
    projectId: string | null;
    startTime: Date;
    endTime: Date;
    comment?: string;
    isOvertime?: boolean;
    overtimeRate?: number | null;
    compMethod?: "money" | "avspasering" | null;
  }) => Promise<unknown>;
  trigger?: React.ReactNode;
}

/** "7" / "7,5" / "7.5" / "7:30" → desimaltimer. */
function parseHoursInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  if (trimmed.includes(":")) {
    const [h, m] = trimmed.split(":").map((s) => Number(s));
    if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
    return h + m / 60;
  }
  const num = Number(trimmed.replace(",", "."));
  return Number.isNaN(num) ? NaN : num;
}

function buildEntryFromHours(date: Date, hours: number): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(8, 0, 0, 0);
  const end = new Date(start.getTime() + hours * 3600 * 1000);
  return { start, end };
}

export function PaperSheetDialog({
  projects,
  normalHoursPerDay = 7.5,
  defaultStartTime,
  defaultEndTime,
  defaultLunchMin,
  onSubmit,
  trigger,
}: PaperSheetDialogProps) {
  // Normaliser HH:MM (Postgres time kan komme som "07:00:00")
  const startHHMM = (defaultStartTime ?? "07:00").slice(0, 5);
  const endHHMM = (defaultEndTime ?? "15:00").slice(0, 5);
  const lunchMin = defaultLunchMin ?? 30;

  // Beregn standard "antall timer" basert på vanlig start–slutt minus lunsj
  const defaultDayHours = (() => {
    const [sh, sm] = startHHMM.split(":").map(Number);
    const [eh, em] = endHHMM.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 7.5;
    const raw = (eh + em / 60) - (sh + sm / 60);
    return Math.max(0, raw - lunchMin / 60);
  })();
  const formatHoursValue = (h: number): string => {
    const rounded = Math.round(h * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
  };

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"day" | "week">("day");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // ── Dag-modus ──
  const [dayDate, setDayDate] = useState<Date>(new Date());
  const [dayHours, setDayHours] = useState<string>("");
  const [dayMore, setDayMore] = useState(false);
  const [dayProjectId, setDayProjectId] = useState<string>(NO_PROJECT_VALUE);
  const [dayUseFromTo, setDayUseFromTo] = useState(false);
  const [dayFrom, setDayFrom] = useState<string>(startHHMM);
  const [dayTo, setDayTo] = useState<string>(endHHMM);
  const [dayComment, setDayComment] = useState<string>("");
  // Norske håndverkere skriver vanligvis 7,5 (lunsj allerede trukket fra).
  // Toggle for de som tenker i skiftlengde (08-16 = 8t på jobb, 7,5t lønn).
  const [daySubtractLunch, setDaySubtractLunch] = useState(false);
  // Overtid (Fase 5a) — vises automatisk når preview > normal
  const [dayOvertimeRate, setDayOvertimeRate] = useState<50 | 100>(50);
  const [dayCompMethod, setDayCompMethod] = useState<"money" | "avspasering">("money");
  const [dayOvertimeAccepted, setDayOvertimeAccepted] = useState(false);

  // ── Uke-modus ──
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [weekHours, setWeekHours] = useState<string[]>(() => Array(7).fill(""));
  const [weekMore, setWeekMore] = useState(false);
  const [weekProjectId, setWeekProjectId] = useState<string>(NO_PROJECT_VALUE);
  const [weekSubtractLunch, setWeekSubtractLunch] = useState(false);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => !p.completed),
    [projects]
  );

  const resetAll = () => {
    setDayDate(new Date());
    setDayHours("");
    setDayMore(false);
    setDayProjectId(NO_PROJECT_VALUE);
    setDayUseFromTo(false);
    setDayFrom(startHHMM);
    setDayTo(endHHMM);
    setDayComment("");
    setDaySubtractLunch(false);
    setDayOvertimeRate(50);
    setDayCompMethod("money");
    setDayOvertimeAccepted(false);
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setWeekHours(Array(7).fill(""));
    setWeekMore(false);
    setWeekProjectId(NO_PROJECT_VALUE);
    setWeekSubtractLunch(false);
  };

  /** Formaterer X.Y timer som "Xt Ym". */
  const formatPreview = (h: number): string => {
    if (h <= 0) return "0t";
    const whole = Math.floor(h);
    const min = Math.round((h - whole) * 60);
    if (min === 0) return `${whole}t`;
    return `${whole}t ${min}m`;
  };

  // Live-preview: hva blir faktisk lagret?
  const dayPreviewHours = useMemo(() => {
    if (dayUseFromTo) {
      const [fh, fm] = dayFrom.split(":").map(Number);
      const [th, tm] = dayTo.split(":").map(Number);
      if ([fh, fm, th, tm].some((n) => Number.isNaN(n))) return null;
      const raw = (th + tm / 60) - (fh + fm / 60);
      if (raw <= 0) return null;
      return Math.max(0, raw - (daySubtractLunch ? 0.5 : 0));
    }
    const parsed = parseHoursInput(dayHours);
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    return Math.max(0, parsed - (daySubtractLunch ? 0.5 : 0));
  }, [dayHours, dayUseFromTo, dayFrom, dayTo, daySubtractLunch]);

  // ── Submit Dag ──
  const handleSubmitDay = async () => {
    let start: Date;
    let end: Date;

    if (dayUseFromTo) {
      const [fh, fm] = dayFrom.split(":").map(Number);
      const [th, tm] = dayTo.split(":").map(Number);
      if ([fh, fm, th, tm].some((n) => Number.isNaN(n))) {
        toast({ variant: "destructive", title: "Ugyldig klokkeslett" });
        return;
      }
      start = new Date(dayDate);
      start.setHours(fh, fm, 0, 0);
      end = new Date(dayDate);
      end.setHours(th, tm, 0, 0);
      if (end <= start) {
        toast({ variant: "destructive", title: "Sluttid må være etter starttid" });
        return;
      }
      // Trekk fra 30 min lunsj hvis valgt
      if (daySubtractLunch) {
        end = new Date(end.getTime() - 30 * 60 * 1000);
        if (end <= start) {
          toast({
            variant: "destructive",
            title: "For kort dag",
            description: "Etter 30 min lunsj-fradrag blir det ingen timer igjen.",
          });
          return;
        }
      }
    } else {
      const rawHours = parseHoursInput(dayHours);
      if (Number.isNaN(rawHours) || rawHours <= 0) {
        toast({
          variant: "destructive",
          title: "Skriv inn timer",
          description: "F.eks. 7, 7,5 eller 7:30",
        });
        return;
      }
      const effectiveHours = Math.max(0, rawHours - (daySubtractLunch ? 0.5 : 0));
      if (effectiveHours <= 0) {
        toast({
          variant: "destructive",
          title: "For få timer",
          description: "Etter 30 min lunsj-fradrag blir det ingenting igjen.",
        });
        return;
      }
      ({ start, end } = buildEntryFromHours(dayDate, effectiveHours));
    }

    // Avgjør om dette skal lagres som overtid
    const finalHours = (end.getTime() - start.getTime()) / 3600000;
    const isOvertime = dayOvertimeAccepted && finalHours > normalHoursPerDay;

    setSubmitting(true);
    try {
      await onSubmit({
        projectId: dayProjectId === NO_PROJECT_VALUE ? null : dayProjectId,
        startTime: start,
        endTime: end,
        comment: dayComment.trim() || undefined,
        isOvertime,
        overtimeRate: isOvertime ? dayOvertimeRate : null,
        compMethod: isOvertime ? dayCompMethod : null,
      });
      resetAll();
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit Uke ──
  const handleSubmitWeek = async () => {
    const items: { date: Date; hours: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const raw = weekHours[i];
      if (!raw.trim()) continue;
      const h = parseHoursInput(raw);
      if (Number.isNaN(h) || h <= 0) {
        toast({
          variant: "destructive",
          title: `Ugyldig timer ${format(weekDays[i], "EEEE", { locale: nb })}`,
        });
        return;
      }
      const effective = Math.max(0, h - (weekSubtractLunch ? 0.5 : 0));
      if (effective <= 0) continue; // hopp over dager der lunsj-trekket eter alt
      items.push({ date: weekDays[i], hours: effective });
    }

    if (items.length === 0) {
      toast({ variant: "destructive", title: "Fyll inn minst én dag" });
      return;
    }

    setSubmitting(true);
    try {
      const projectId = weekProjectId === NO_PROJECT_VALUE ? null : weekProjectId;
      for (const item of items) {
        const { start, end } = buildEntryFromHours(item.date, item.hours);
        await onSubmit({ projectId, startTime: start, endTime: end });
      }
      resetAll();
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Dato-label ──
  const dateLabel = isToday(dayDate)
    ? "I dag"
    : format(dayDate, "EEEE d. MMM", { locale: nb });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetAll();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
            <ClipboardList className="h-4 w-4" />
            Skriv inn timer
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[420px] max-h-[92vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl tracking-tight">Skriv inn timer</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "day" | "week")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="day">Dag</TabsTrigger>
            <TabsTrigger value="week">Uke</TabsTrigger>
          </TabsList>

          {/* ─────── DAG ─────── */}
          <TabsContent value="day" className="pt-6 space-y-6">
            {/* Dato-pille */}
            <div className="flex justify-center">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-full hover:bg-muted/50 capitalize">
                    {dateLabel}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={dayDate}
                    onSelect={(d) => d && setDayDate(d)}
                    weekStartsOn={1}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Stort tallfelt */}
            {!dayUseFromTo ? (
              <div className="flex flex-col items-center gap-2">
                <Input
                  inputMode="decimal"
                  autoFocus
                  placeholder="0"
                  value={dayHours}
                  onChange={(e) => setDayHours(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmitDay();
                  }}
                  className="h-20 text-center text-5xl font-semibold tabular-nums tracking-tight border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-primary px-0"
                />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  timer
                </span>
                {/* Snarvei: vanlig dag */}
                {defaultDayHours > 0 && (
                  <button
                    type="button"
                    onClick={() => setDayHours(formatHoursValue(defaultDayHours))}
                    className="mt-1 text-xs text-primary hover:underline tabular-nums"
                  >
                    Vanlig dag ({startHHMM}–{endHHMM} = {formatHoursValue(defaultDayHours)}t)
                  </button>
                )}
                {/* Live preview når lunsj trekkes fra */}
                {daySubtractLunch && dayPreviewHours !== null && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Lagres som <span className="font-semibold text-foreground">{formatPreview(dayPreviewHours)}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 text-center">Fra</p>
                  <Input
                    type="time"
                    value={dayFrom}
                    onChange={(e) => setDayFrom(e.target.value)}
                    className="text-center text-xl tabular-nums h-16"
                  />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 text-center">Til</p>
                  <Input
                    type="time"
                    value={dayTo}
                    onChange={(e) => setDayTo(e.target.value)}
                    className="text-center text-xl tabular-nums h-16"
                  />
                </div>
              </div>
            )}

            {/* Flere valg ▾ */}
            <div className="border-t border-border/40 pt-3">
              <button
                onClick={() => setDayMore((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                {dayMore ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Flere valg
              </button>

              {dayMore && (
                <div className="space-y-3 pt-4 animate-fade-in">
                  {/* Trekk fra lunsj */}
                  <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Trekk fra 30 min lunsj</p>
                      <p className="text-[11px] text-muted-foreground">
                        Skru på hvis du skriver inn skiftlengden (f.eks. 8 t for 08–16)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={daySubtractLunch}
                      onChange={(e) => setDaySubtractLunch(e.target.checked)}
                      className="h-4 w-4 accent-primary flex-shrink-0"
                    />
                  </label>

                  {/* Prosjekt */}
                  <Select value={dayProjectId} onValueChange={setDayProjectId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Velg prosjekt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PROJECT_VALUE}>Uten prosjekt</SelectItem>
                      {activeProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Fra-til-bytte */}
                  <button
                    onClick={() => setDayUseFromTo((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    {dayUseFromTo ? "← Bytt til antall timer" : "Bruk fra–til klokkeslett →"}
                  </button>

                  {/* Kommentar */}
                  <Textarea
                    placeholder="Kommentar (valgfritt)"
                    value={dayComment}
                    onChange={(e) => setDayComment(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─────── UKE ─────── */}
          <TabsContent value="week" className="pt-6 space-y-4">
            {/* Ukenavigasjon */}
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setWeekStart((d) => addDays(d, -7))}
                className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                ←
              </button>
              <span className="text-muted-foreground tabular-nums">
                {format(weekStart, "d. MMM", { locale: nb })} –{" "}
                {format(addDays(weekStart, 6), "d. MMM", { locale: nb })}
              </span>
              <button
                onClick={() => setWeekStart((d) => addDays(d, 7))}
                className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                →
              </button>
            </div>

            {/* 7 dager */}
            <div className="space-y-1">
              {weekDays.map((d, i) => {
                const today = isToday(d);
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg",
                      today && "bg-primary/5"
                    )}
                  >
                    <div className="w-20 flex-shrink-0">
                      <p
                        className={cn(
                          "text-sm capitalize",
                          today ? "font-semibold text-primary" : "font-medium"
                        )}
                      >
                        {format(d, "EEE", { locale: nb })}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {format(d, "d. MMM", { locale: nb })}
                      </p>
                    </div>
                    <Input
                      inputMode="decimal"
                      placeholder="0"
                      value={weekHours[i]}
                      onChange={(e) => {
                        const next = [...weekHours];
                        next[i] = e.target.value;
                        setWeekHours(next);
                      }}
                      className="flex-1 h-9 text-right tabular-nums text-base"
                    />
                    <span className="text-xs text-muted-foreground w-4">t</span>
                  </div>
                );
              })}
            </div>

            {/* Flere valg ▾ */}
            <div className="border-t border-border/40 pt-3">
              <button
                onClick={() => setWeekMore((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                {weekMore ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Flere valg
              </button>

              {weekMore && (
                <div className="pt-4 space-y-3 animate-fade-in">
                  {/* Trekk fra lunsj — gjelder hele uken */}
                  <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Trekk fra 30 min lunsj</p>
                      <p className="text-[11px] text-muted-foreground">
                        Trekkes fra hver dag du fyller inn
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={weekSubtractLunch}
                      onChange={(e) => setWeekSubtractLunch(e.target.checked)}
                      className="h-4 w-4 accent-primary flex-shrink-0"
                    />
                  </label>

                  <Select value={weekProjectId} onValueChange={setWeekProjectId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Velg prosjekt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PROJECT_VALUE}>Uten prosjekt</SelectItem>
                      {activeProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── Overtid-banner (Dag-fanen) ─── */}
        {tab === "day" &&
          dayPreviewHours !== null &&
          dayPreviewHours > normalHoursPerDay && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-3 mt-2 animate-fade-in">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dayOvertimeAccepted}
                  onChange={(e) => setDayOvertimeAccepted(e.target.checked)}
                  className="h-4 w-4 mt-0.5 accent-orange-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-medium">
                    Marker som overtid?{" "}
                    <span className="text-muted-foreground tabular-nums font-normal">
                      ({formatPreview(dayPreviewHours - normalHoursPerDay)} over normal)
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Du har skrevet inn mer enn {normalHoursPerDay}t. Marker som overtid for riktig lønn.
                  </p>
                </div>
              </label>

              {dayOvertimeAccepted && (
                <div className="space-y-2 pl-6 animate-fade-in">
                  {/* Sats */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Sats</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDayOvertimeRate(50)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                          dayOvertimeRate === 50
                            ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        50% (hverdag)
                      </button>
                      <button
                        onClick={() => setDayOvertimeRate(100)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                          dayOvertimeRate === 100
                            ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        100% (kveld/helg)
                      </button>
                    </div>
                  </div>

                  {/* Kompensasjon */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Kompensasjon</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDayCompMethod("money")}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                          dayCompMethod === "money"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        Utbetaling
                      </button>
                      <button
                        onClick={() => setDayCompMethod("avspasering")}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                          dayCompMethod === "avspasering"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        Avspasering
                      </button>
                    </div>
                    {dayCompMethod === "avspasering" && (
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Grunntimene tas ut som fri senere. Tillegget ({dayOvertimeRate}%) utbetales uansett (lovkrav).
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        <DialogFooter className="sm:justify-stretch">
          <Button
            onClick={tab === "day" ? handleSubmitDay : handleSubmitWeek}
            disabled={submitting}
            className="w-full h-14 text-lg font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {submitting ? "Lagrer…" : "Lagre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
