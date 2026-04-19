/**
 * Min oversikt — moderne dashboard-design med hero metrics, stat-kort, bar chart,
 * månedsoversikt og dagens aktivitet. Erstatter den gamle grå tekstbaserte siden.
 */
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useNavigate } from "react-router-dom";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  format,
  addDays,
  startOfDay,
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

  // Week/month date calculations (these change every render, don't memoize)
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Overtime calculations
  const weekOt = useMemo(
    () => calculateRangeOvertime(entriesLite, weekStart, weekEnd, config),
    [entriesLite, weekStart, weekEnd, config]
  );

  const lastWeekOt = useMemo(
    () => calculateRangeOvertime(entriesLite, lastWeekStart, lastWeekEnd, config),
    [entriesLite, lastWeekStart, lastWeekEnd, config]
  );

  const monthOt = useMemo(
    () => calculateRangeOvertime(entriesLite, monthStart, monthEnd, config),
    [entriesLite, monthStart, monthEnd, config]
  );

  // Salary calculations
  const weekGross = useMemo(() => {
    return hourlyRate > 0
      ? weekOt.normalHours * hourlyRate +
          weekOt.rate50Hours * hourlyRate * 1.5 +
          weekOt.rate100Hours * hourlyRate * 2.0
      : 0;
  }, [weekOt, hourlyRate]);

  const weekNet = weekGross * taxMultiplier;

  const monthGross = useMemo(() => {
    return hourlyRate > 0
      ? monthOt.normalHours * hourlyRate +
          monthOt.rate50Hours * hourlyRate * 1.5 +
          monthOt.rate100Hours * hourlyRate * 2.0
      : 0;
  }, [monthOt, hourlyRate]);

  const monthNet = monthGross * taxMultiplier;

  // Driving data
  const weekDriveEntries = useMemo(() => {
    if (!user) return [];
    return driveEntries.filter((d) => {
      const dDate = new Date(d.start_time);
      return dDate >= weekStart && dDate <= weekEnd && d.user_id === user.id;
    });
  }, [driveEntries, weekStart, weekEnd, user]);

  const weekKilometers = weekDriveEntries.reduce((sum, d) => sum + (d.kilometers || 0), 0);

  // Week totals and trend
  const weekTotalHours = weekOt.normalHours + weekOt.overtimeHours;
  const lastWeekTotalHours = lastWeekOt.normalHours + lastWeekOt.overtimeHours;
  const hoursDelta = weekTotalHours - lastWeekTotalHours;
  const hoursPct =
    lastWeekTotalHours > 0 ? (hoursDelta / lastWeekTotalHours) * 100 : 0;

  // Avspasering
  const avspaseringHours = useMemo(
    () => calculateAvspaseringBalance(entriesLite),
    [entriesLite]
  );

  // Animerte verdier for KPI-kort (ruller opp ved sidelaste / data-endring)
  const animatedHours = useCountUp(weekTotalHours);
  const animatedNet = useCountUp(weekNet);
  const animatedKm = useCountUp(weekKilometers);
  const animatedOvertime = useCountUp(weekOt.overtimeHours);

  // Bar chart data
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      const dayStart = startOfDay(dayDate);
      const dayEnd = addDays(dayStart, 1);

      const dayEntries = entriesLite.filter((e) => {
        const eDate = new Date(e.start_time);
        return eDate >= dayStart && eDate < dayEnd;
      });

      const daySeconds = dayEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
      const dayHours = daySeconds / 3600;

      const normalHours = Math.min(dayHours, config.normalHoursPerDay);
      const overtimeHours = Math.max(0, dayHours - config.normalHoursPerDay);

      data.push({
        day: fmtWeekday(dayDate),
        normal: parseFloat(normalHours.toFixed(2)),
        overtime: parseFloat(overtimeHours.toFixed(2)),
        total: parseFloat(dayHours.toFixed(2)),
      });
    }
    return data;
  }, [entriesLite, weekStart, config.normalHoursPerDay]);

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
          Helheten i timer, lønn og overtid for uken og måneden.
        </p>
      </div>

      {/* Hero: This week's hours */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/2 border-primary/20 transition-all duration-200 hover:shadow-md hover:border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                Denne uken
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl sm:text-7xl font-bold tabular-nums tracking-tighter leading-none">
                  {Math.floor(animatedHours)}
                </span>
                <span className="text-2xl font-semibold text-muted-foreground">t</span>
              </div>
            </div>

            {/* Trend badge */}
            <div className="text-right">
              {hoursDelta === 0 && lastWeekTotalHours === 0 ? (
                <p className="text-caption text-muted-foreground">Ingen data ennå</p>
              ) : hoursDelta === 0 && lastWeekTotalHours > 0 ? (
                <div className="flex items-center justify-end gap-1.5 px-3 py-1.5 rounded-lg bg-muted">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-caption font-medium text-muted-foreground">
                    Samme som forrige uke
                  </span>
                </div>
              ) : (
                <div
                  className={`flex items-center justify-end gap-1.5 px-3 py-1.5 rounded-lg ${
                    hoursDelta > 0
                      ? "bg-emerald-500/10"
                      : "bg-red-500/10"
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
                  brutto {formatNok(weekGross)}
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
                    {weekDriveEntries.length} kjøreturer
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
                  50%: {formatHours(weekOt.rate50Hours, "short")} · 100%: {formatHours(weekOt.rate100Hours, "short")}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-500/10 flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart: Daily hours this week */}
      <Card>
        <CardHeader>
          <h3 className="text-caption uppercase tracking-wider text-muted-foreground">
            Denne uken — timer per dag
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
              <p className="text-caption text-muted-foreground">Ingen registreringer denne uken</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Month overview: Compact version */}
      <Card>
        <CardHeader>
          <h3 className="text-caption uppercase tracking-wider text-muted-foreground">
            Denne måneden
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Left column: Timer & lønn */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                Timer
              </p>
              <p className="text-2xl font-bold tabular-nums mb-3">
                {formatHours(monthOt.normalHours + monthOt.overtimeHours)}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums mb-4">
                {formatHours(monthOt.normalHours, "short")} normal · {formatHours(monthOt.overtimeHours, "short")} overtid
              </p>

              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                Lønn (netto)
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {formatNok(monthNet)}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums mt-1">
                brutto {formatNok(monthGross)}
              </p>
            </div>

            {/* Right column: Breakdown & avspasering */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                Overtid-fordeling
              </p>
              {monthOt.rate50Hours + monthOt.rate100Hours > 0 ? (
                <div className="mb-4">
                  {/* Stacked horisontal bar */}
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted/40 mb-2.5">
                    {monthOt.rate50Hours > 0 && (
                      <div
                        className="bg-orange-400/80 h-full transition-all duration-700 motion-reduce:transition-none"
                        style={{
                          flexGrow: monthOt.rate50Hours,
                        }}
                        aria-label={`50% tillegg: ${formatHours(monthOt.rate50Hours, "short")}`}
                      />
                    )}
                    {monthOt.rate100Hours > 0 && (
                      <div
                        className="bg-red-500/80 h-full transition-all duration-700 motion-reduce:transition-none"
                        style={{
                          flexGrow: monthOt.rate100Hours,
                        }}
                        aria-label={`100% tillegg: ${formatHours(monthOt.rate100Hours, "short")}`}
                      />
                    )}
                  </div>
                  <div className="flex justify-between gap-2 text-[11px] tabular-nums">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-orange-400/80" />
                      <span className="text-muted-foreground">50%</span>
                      <span className="font-medium">{formatHours(monthOt.rate50Hours, "short")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500/80" />
                      <span className="text-muted-foreground">100%</span>
                      <span className="font-medium">{formatHours(monthOt.rate100Hours, "short")}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/80 italic mb-4">
                  Ingen overtid denne måneden
                </p>
              )}

              {avspaseringHours > 0 && (
                <>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                    Avspasering
                  </p>
                  <p className="text-lg font-bold tabular-nums text-primary">
                    {formatHours(avspaseringHours, "short")}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
