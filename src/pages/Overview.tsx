/**
 * Min oversikt — moderne dashboard-design med hero metrics, stat-kort, bar chart,
 * månedsoversikt og dagens aktivitet. Erstatter den gamle grå tekstbaserte siden.
 */
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useNavigate } from "react-router-dom";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addWeeks,
  addMonths,
  addYears,
  format,
  addDays,
  startOfDay,
  getISOWeek,
  isSameMonth,
  isSameYear,
  isSameWeek,
  differenceInCalendarMonths,
} from "date-fns";
import { nb } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Banknote,
  Car,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DayOverviewCard } from "@/components/DayOverviewCard";
import {
  calculateRangeOvertime,
  calculateAvspaseringBalance,
  OvertimeConfig,
  type TimeEntryLite,
} from "@/lib/overtime";
import { formatNok, formatHours } from "@/lib/salary";
import { useCountUp } from "@/hooks/useCountUp";

// Capitalize ukedag-forkortelse fra date-fns ("man." → "Man")
const fmtWeekday = (d: Date) =>
  format(d, "EEE", { locale: nb })
    .replace(".", "")
    .replace(/^(.)/, (c) => c.toUpperCase());

// Custom tooltip — viser dato, total, og breakdown med farge-prikker
type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: { day: string; total: number } }>;
  label?: string;
};
function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload[0]?.payload?.total ?? 0;
  return (
    <div className="rounded-xl border border-border/40 bg-card/95 backdrop-blur-sm shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      <p className="tabular-nums text-foreground/90 mb-1.5">
        Totalt: <span className="font-semibold">{formatHours(total, "short")}</span>
      </p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 tabular-nums">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-muted-foreground">
              {p.name === "normal" ? "Normal" : "Overtid"}
            </span>
            <span className="ml-auto font-medium">{formatHours(p.value ?? 0, "short")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type ViewPeriod = "week" | "month" | "year";

export default function Overview() {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();
  const {
    projects,
    timeEntries,
    timeEntryPauses,
    driveEntries,
    deleteTimeEntryAsync,
    updateTimeEntry,
  } = useProjects(user?.id);

  // Periode-velger: hvilken type + offset (0 = nåværende, -1 = forrige, osv.)
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>("month");
  const [periodOffset, setPeriodOffset] = useState(0);

  // Reset offset når man bytter periodetype så vi alltid starter på "nåværende"
  const changePeriod = (next: ViewPeriod) => {
    setViewPeriod(next);
    setPeriodOffset(0);
  };

  // All hooks must be defined before any early returns
  const entriesLite: TimeEntryLite[] = useMemo(
    () => {
      if (!user) return [];
      return timeEntries
        .filter((e) => e.user_id === user.id && e.end_time)
        .map((e) => ({
          id: e.id,
          start_time: e.start_time,
          end_time: e.end_time,
          duration_seconds: e.duration_seconds,
          is_overtime: e.is_overtime ?? undefined,
          overtime_rate: e.overtime_rate ?? undefined,
          comp_method: e.comp_method ?? undefined,
        }));
    },
    [timeEntries, user]
  );

  const config: OvertimeConfig = useMemo(
    () => ({
      normalHoursPerDay: profile?.normal_hours_per_day ?? 7.5,
      normalHoursPerWeek: profile?.normal_hours_per_week ?? 37.5,
    }),
    [profile?.normal_hours_per_day, profile?.normal_hours_per_week]
  );

  const hourlyRate = profile?.hourly_rate_nok ?? 0;
  const taxPct = profile?.tax_percentage ?? 0;
  const taxMultiplier = 1 - taxPct / 100;
  const hasRate = hourlyRate > 0;

  // Beregn aktuelt og forrige tidsrom basert på (viewPeriod, periodOffset)
  const now = new Date();
  const { rangeStart, rangeEnd, prevRangeStart, prevRangeEnd } = useMemo(() => {
    if (viewPeriod === "week") {
      const anchor = addWeeks(now, periodOffset);
      const s = startOfWeek(anchor, { weekStartsOn: 1 });
      const e = endOfWeek(anchor, { weekStartsOn: 1 });
      const ps = startOfWeek(addWeeks(anchor, -1), { weekStartsOn: 1 });
      const pe = endOfWeek(addWeeks(anchor, -1), { weekStartsOn: 1 });
      return { rangeStart: s, rangeEnd: e, prevRangeStart: ps, prevRangeEnd: pe };
    }
    if (viewPeriod === "month") {
      const anchor = addMonths(now, periodOffset);
      const s = startOfMonth(anchor);
      const e = endOfMonth(anchor);
      const ps = startOfMonth(addMonths(anchor, -1));
      const pe = endOfMonth(addMonths(anchor, -1));
      return { rangeStart: s, rangeEnd: e, prevRangeStart: ps, prevRangeEnd: pe };
    }
    // year
    const anchor = addYears(now, periodOffset);
    const s = startOfYear(anchor);
    const e = endOfYear(anchor);
    const ps = startOfYear(addYears(anchor, -1));
    const pe = endOfYear(addYears(anchor, -1));
    return { rangeStart: s, rangeEnd: e, prevRangeStart: ps, prevRangeEnd: pe };
    // Stable JSON keys to avoid re-running every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewPeriod, periodOffset, now.toDateString()]);

  // Overtime calculations for valgt periode + forrige periode (for trend)
  const selectedOt = useMemo(
    () => calculateRangeOvertime(entriesLite, rangeStart, rangeEnd, config),
    [entriesLite, rangeStart, rangeEnd, config]
  );

  const prevOt = useMemo(
    () => calculateRangeOvertime(entriesLite, prevRangeStart, prevRangeEnd, config),
    [entriesLite, prevRangeStart, prevRangeEnd, config]
  );

  // Salary
  const selectedGross = useMemo(() => {
    return hourlyRate > 0
      ? selectedOt.normalHours * hourlyRate +
          selectedOt.rate50Hours * hourlyRate * 1.5 +
          selectedOt.rate100Hours * hourlyRate * 2.0
      : 0;
  }, [selectedOt, hourlyRate]);

  const selectedNet = selectedGross * taxMultiplier;

  // Driving for valgt periode
  const selectedDriveEntries = useMemo(() => {
    if (!user) return [];
    return driveEntries.filter((d) => {
      const dDate = new Date(d.start_time);
      return dDate >= rangeStart && dDate <= rangeEnd && d.user_id === user.id;
    });
  }, [driveEntries, rangeStart, rangeEnd, user]);

  const selectedKilometers = selectedDriveEntries.reduce((sum, d) => sum + (d.kilometers || 0), 0);

  // Totaler + trend
  const selectedTotalHours = selectedOt.normalHours + selectedOt.overtimeHours;
  const prevTotalHours = prevOt.normalHours + prevOt.overtimeHours;
  const hoursDelta = selectedTotalHours - prevTotalHours;
  const hoursPct = prevTotalHours > 0 ? (hoursDelta / prevTotalHours) * 100 : 0;

  // Avspasering — alltid total saldo
  const avspaseringHours = useMemo(
    () => calculateAvspaseringBalance(entriesLite),
    [entriesLite]
  );

  // Animerte verdier
  const animatedHours = useCountUp(selectedTotalHours);
  const animatedNet = useCountUp(selectedNet);
  const animatedKm = useCountUp(selectedKilometers);
  const animatedOvertime = useCountUp(selectedOt.overtimeHours);

  // Etiketter for periode-velger
  const periodLabel = useMemo(() => {
    if (viewPeriod === "week") {
      const wk = getISOWeek(rangeStart);
      const sameMonth = isSameMonth(rangeStart, rangeEnd);
      const startStr = format(rangeStart, sameMonth ? "d." : "d. MMM", { locale: nb });
      const endStr = format(rangeEnd, "d. MMM yyyy", { locale: nb });
      return `Uke ${wk} · ${startStr}–${endStr}`;
    }
    if (viewPeriod === "month") {
      return format(rangeStart, "MMMM yyyy", { locale: nb }).replace(/^(.)/, (c) => c.toUpperCase());
    }
    return format(rangeStart, "yyyy");
  }, [viewPeriod, rangeStart, rangeEnd]);

  const prevLabel =
    viewPeriod === "week" ? "forrige uke"
    : viewPeriod === "month" ? "forrige måned"
    : "forrige år";

  const atCurrent = periodOffset === 0;
  const atPresent =
    viewPeriod === "week" ? isSameWeek(rangeStart, now, { weekStartsOn: 1 })
    : viewPeriod === "month" ? isSameMonth(rangeStart, now)
    : isSameYear(rangeStart, now);

  // Bar chart data — adapter granularitet etter valgt periode
  const chartData = useMemo(() => {
    const data: { day: string; normal: number; overtime: number; total: number }[] = [];

    if (viewPeriod === "week") {
      // 7 daglige bars (Man–Søn)
      for (let i = 0; i < 7; i++) {
        const dayDate = addDays(rangeStart, i);
        const dayStart = startOfDay(dayDate);
        const dayEnd = addDays(dayStart, 1);
        const dayEntries = entriesLite.filter((e) => {
          const eDate = new Date(e.start_time);
          return eDate >= dayStart && eDate < dayEnd;
        });
        const daySeconds = dayEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
        const dayHours = daySeconds / 3600;
        const normalH = Math.min(dayHours, config.normalHoursPerDay);
        const overtimeH = Math.max(0, dayHours - config.normalHoursPerDay);
        data.push({
          day: fmtWeekday(dayDate),
          normal: parseFloat(normalH.toFixed(2)),
          overtime: parseFloat(overtimeH.toFixed(2)),
          total: parseFloat(dayHours.toFixed(2)),
        });
      }
    } else if (viewPeriod === "month") {
      // Ukentlige bars i måneden (kun uker som overlapper med måneden)
      let cursor = startOfWeek(rangeStart, { weekStartsOn: 1 });
      while (cursor <= rangeEnd) {
        const wkStart = cursor;
        const wkEnd = endOfWeek(cursor, { weekStartsOn: 1 });
        // Klipp til månedens grenser
        const sliceStart = wkStart < rangeStart ? rangeStart : wkStart;
        const sliceEnd = wkEnd > rangeEnd ? rangeEnd : wkEnd;
        const wkOt = calculateRangeOvertime(entriesLite, sliceStart, sliceEnd, config);
        const total = wkOt.normalHours + wkOt.overtimeHours;
        data.push({
          day: `U${getISOWeek(wkStart)}`,
          normal: parseFloat(wkOt.normalHours.toFixed(2)),
          overtime: parseFloat(wkOt.overtimeHours.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
        });
        cursor = addWeeks(cursor, 1);
      }
    } else {
      // year — 12 månedlige bars (Jan–Des)
      for (let i = 0; i < 12; i++) {
        const monthDate = addMonths(rangeStart, i);
        const mStart = startOfMonth(monthDate);
        const mEnd = endOfMonth(monthDate);
        const mOt = calculateRangeOvertime(entriesLite, mStart, mEnd, config);
        const total = mOt.normalHours + mOt.overtimeHours;
        data.push({
          day: format(monthDate, "MMM", { locale: nb })
            .replace(".", "")
            .replace(/^(.)/, (c) => c.toUpperCase()),
          normal: parseFloat(mOt.normalHours.toFixed(2)),
          overtime: parseFloat(mOt.overtimeHours.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
        });
      }
    }
    return data;
  }, [viewPeriod, rangeStart, rangeEnd, entriesLite, config]);

  // Early returns
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Lasters…</p>
      </div>
    );
  }

  if (!hasRate) {
    return (
      <div className="py-6 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Min oversikt</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-snug">
            Helheten i timer, lønn og overtid for uken og måneden.
          </p>
        </div>

        <Card className="animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-callout font-semibold tracking-tight mb-1">
                  Sett opp lønn
                </h3>
                <p className="text-caption text-muted-foreground mb-4 leading-snug">
                  For å se inntekt, overtid og andre økonomiske oversikter, må du først
                  sette opp timesats og skatteprosent i innstillinger.
                </p>
                <Button
                  onClick={() => navigate("/more/work")}
                  className="gap-1.5 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  <SettingsIcon className="h-4 w-4" />
                  Gå til innstillinger
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main dashboard render
  return (
    <div className="py-6 px-4 sm:px-6 max-w-5xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Min oversikt</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-snug">
          Bla mellom uker, måneder og år for å se timer, lønn og overtid.
        </p>
      </div>

      {/* Periode-velger: Uke / Måned / År */}
      <div className="inline-flex rounded-xl bg-muted/50 p-1 gap-1">
        {(["week", "month", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => changePeriod(p)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
              viewPeriod === p
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p === "week" ? "Uke" : p === "month" ? "Måned" : "År"}
          </button>
        ))}
      </div>

      {/* Periode-navigasjon: ← [label] → */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPeriodOffset((o) => o - 1)}
          aria-label={`Forrige ${viewPeriod === "week" ? "uke" : viewPeriod === "month" ? "måned" : "år"}`}
          className="h-10 w-10 rounded-xl border border-border/40 bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border active:scale-[0.96] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 text-center">
          <p className="text-base font-semibold tracking-tight">{periodLabel}</p>
          {!atCurrent && (
            <button
              onClick={() => setPeriodOffset(0)}
              className="text-xs text-primary hover:underline mt-0.5"
            >
              Tilbake til nå
            </button>
          )}
        </div>

        <button
          onClick={() => setPeriodOffset((o) => o + 1)}
          disabled={atPresent}
          aria-label={`Neste ${viewPeriod === "week" ? "uke" : viewPeriod === "month" ? "måned" : "år"}`}
          className="h-10 w-10 rounded-xl border border-border/40 bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border active:scale-[0.96] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Hero: Valgt periode (primær) */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/2 border-primary/20 transition-all duration-200 hover:shadow-md hover:border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                Totale timer
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl sm:text-7xl font-bold tabular-nums tracking-tighter leading-none">
                  {Math.floor(animatedHours)}
                </span>
                <span className="text-2xl font-semibold text-muted-foreground">t</span>
              </div>
            </div>

            {/* Trend badge — sammenligner med forrige periode */}
            <div className="text-right">
              {hoursDelta === 0 && prevTotalHours === 0 ? (
                <p className="text-caption text-muted-foreground">Ingen data ennå</p>
              ) : hoursDelta === 0 && prevTotalHours > 0 ? (
                <div className="flex items-center justify-end gap-1.5 px-3 py-1.5 rounded-lg bg-muted">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-caption font-medium text-muted-foreground">
                    Samme som {prevLabel}
                  </span>
                </div>
              ) : (
                <div
                  className={`flex items-center justify-end gap-1.5 px-3 py-1.5 rounded-lg ${
                    hoursDelta > 0 ? "bg-emerald-500/10" : "bg-red-500/10"
                  }`}
                >
                  {hoursDelta > 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                  <span
                    className={`text-caption font-medium tabular-nums ${
                      hoursDelta > 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {hoursDelta > 0 ? "↑" : "↓"} {Math.abs(hoursDelta).toFixed(1)}t ({Math.abs(hoursPct).toFixed(0)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards: Lønn, Kjøring (valgfri), Overtid */}
      <div className={`grid grid-cols-1 gap-3 ${profile?.show_driving_card !== false ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {/* Lønn card */}
        <Card className="bg-emerald-500/5 border-emerald-500/20 transition-all duration-200 hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                  Lønn (netto)
                </p>
                <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatNok(animatedNet)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums mt-1">
                  brutto {formatNok(selectedGross)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 flex-shrink-0">
                <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kjøring card — skjulbar via profile.show_driving_card */}
        {profile?.show_driving_card !== false && (
          <Card className="bg-sky-500/5 border-sky-500/20 transition-all duration-200 hover:shadow-md hover:border-sky-500/30 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                    Kjøring
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-sky-700 dark:text-sky-300">
                    {Math.round(animatedKm)} km
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums mt-1">
                    {selectedDriveEntries.length} kjøreturer
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-500/10 flex-shrink-0">
                  <Car className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overtid card */}
        <Card className="bg-orange-500/5 border-orange-500/20 transition-all duration-200 hover:shadow-md hover:border-orange-500/30 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                  Overtid
                </p>
                <p className="text-2xl font-bold tabular-nums text-orange-700 dark:text-orange-300">
                  {formatHours(animatedOvertime, "short")}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums mt-1">
                  50%: {formatHours(selectedOt.rate50Hours, "short")} · 100%: {formatHours(selectedOt.rate100Hours, "short")}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-500/10 flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart: granularitet avhenger av valgt periode */}
      <Card>
        <CardHeader>
          <h3 className="text-caption uppercase tracking-wider text-muted-foreground">
            {viewPeriod === "week"
              ? "Timer per dag"
              : viewPeriod === "month"
              ? "Timer per uke"
              : "Timer per måned"}
          </h3>
        </CardHeader>
        <CardContent>
          {chartData.some((d) => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="normalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  </linearGradient>
                  <linearGradient id="overtimeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border) / 0.4)"
                />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  style={{ fontSize: "11px" }}
                  tickFormatter={(v: number) => `${v}t`}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)", radius: 6 }}
                  content={<ChartTooltip />}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) =>
                    value === "normal" ? "Normal" : "Overtid"
                  }
                />
                <Bar
                  dataKey="normal"
                  stackId="hours"
                  fill="url(#normalGradient)"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="overtime"
                  stackId="hours"
                  fill="url(#overtimeGradient)"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground/20 mb-2" />
              <p className="text-caption text-muted-foreground">
                Ingen registreringer i denne perioden
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overtid-fordeling for valgt periode + avspasering (alltid total) */}
      {(selectedOt.rate50Hours + selectedOt.rate100Hours > 0 || avspaseringHours > 0) && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                  Overtid-fordeling
                </p>
                {selectedOt.rate50Hours + selectedOt.rate100Hours > 0 ? (
                  <div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-muted/40 mb-2">
                      {selectedOt.rate50Hours > 0 && (
                        <div
                          className="bg-orange-400/80 h-full transition-all duration-700 motion-reduce:transition-none"
                          style={{ flexGrow: selectedOt.rate50Hours }}
                          aria-label={`50% tillegg: ${formatHours(selectedOt.rate50Hours, "short")}`}
                        />
                      )}
                      {selectedOt.rate100Hours > 0 && (
                        <div
                          className="bg-red-500/80 h-full transition-all duration-700 motion-reduce:transition-none"
                          style={{ flexGrow: selectedOt.rate100Hours }}
                          aria-label={`100% tillegg: ${formatHours(selectedOt.rate100Hours, "short")}`}
                        />
                      )}
                    </div>
                    <div className="flex justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-orange-400/80" />
                        <span>50% {formatHours(selectedOt.rate50Hours, "short")}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500/80" />
                        <span>100% {formatHours(selectedOt.rate100Hours, "short")}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/80 italic">Ingen overtid i denne perioden</p>
                )}
              </div>

              {avspaseringHours > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                    Avspasering (totalt)
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-primary">
                    {formatHours(avspaseringHours, "short")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's activity merged card */}
      <DayOverviewCard
        timeEntries={timeEntries}
        timeEntryPauses={timeEntryPauses}
        projects={projects}
        userId={user.id}
        onDelete={deleteTimeEntryAsync}
        onUpdate={updateTimeEntry}
      />
    </div>
  );
}
