import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import { BarChart3, Clock, Settings as SettingsIcon } from "lucide-react";
import { TimeEntry } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { formatNok, formatHours } from "@/lib/salary";
import {
  calculateRangeOvertime,
  calculateAvspaseringBalance,
  OvertimeConfig,
  type TimeEntryLite,
} from "@/lib/overtime";

interface MonthOverviewCardProps {
  timeEntries: TimeEntry[];
  userId: string;
}

/**
 * Min oversikt — holistic view of work and earnings for current week and month.
 * Shows total hours, normal vs overtime breakdown, gross and net earnings.
 * Includes avspaseringssaldo (comp time balance).
 */
export function MonthOverviewCard({ timeEntries, userId }: MonthOverviewCardProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { weekGross, weekNet, weekNormalHours, weekOvertimeHours, monthGross, monthNet, monthNormalHours, monthOvertimeHours, avspaseringHours, hasRate } = useMemo(() => {
    const now = new Date();

    // Narrow to this user's entries with end_time
    const userEntries = timeEntries.filter(
      (e) => e.user_id === userId && e.end_time
    );

    // Convert TimeEntry → TimeEntryLite for overtime.ts
    const entriesLite: TimeEntryLite[] = userEntries.map((e) => ({
      id: e.id,
      start_time: e.start_time,
      end_time: e.end_time,
      duration_seconds: e.duration_seconds,
      is_overtime: e.is_overtime ?? undefined,
      overtime_rate: e.overtime_rate ?? undefined,
      comp_method: e.comp_method ?? undefined,
    }));

    // Get range boundaries (ISO weeks: Monday-Sunday)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // OvertimeConfig from profile (defaults: 7.5/37.5)
    const config: OvertimeConfig = {
      normalHoursPerDay: profile?.normal_hours_per_day ?? 7.5,
      normalHoursPerWeek: profile?.normal_hours_per_week ?? 37.5,
    };

    // Calculate week overtime
    const weekOt = calculateRangeOvertime(entriesLite, weekStart, weekEnd, config);

    // Calculate month overtime
    const monthOt = calculateRangeOvertime(entriesLite, monthStart, monthEnd, config);

    // Gross pay using overtime rates
    const hourlyRate = profile?.hourly_rate_nok ?? 0;
    const weekGrossNok = hourlyRate > 0
      ? weekOt.normalHours * hourlyRate +
        weekOt.rate50Hours * hourlyRate * 1.5 +
        weekOt.rate100Hours * hourlyRate * 2.0
      : 0;

    const monthGrossNok = hourlyRate > 0
      ? monthOt.normalHours * hourlyRate +
        monthOt.rate50Hours * hourlyRate * 1.5 +
        monthOt.rate100Hours * hourlyRate * 2.0
      : 0;

    // Net = gross × (1 - tax% / 100)
    const taxPct = profile?.tax_percentage ?? 0;
    const taxMultiplier = 1 - taxPct / 100;
    const weekNetNok = weekGrossNok * taxMultiplier;
    const monthNetNok = monthGrossNok * taxMultiplier;

    // Avspasering balance
    const avspasering = calculateAvspaseringBalance(entriesLite);

    return {
      weekGross: weekGrossNok,
      weekNet: weekNetNok,
      weekNormalHours: weekOt.normalHours,
      weekOvertimeHours: weekOt.overtimeHours,
      monthGross: monthGrossNok,
      monthNet: monthNetNok,
      monthNormalHours: monthOt.normalHours,
      monthOvertimeHours: monthOt.overtimeHours,
      avspaseringHours: avspasering,
      hasRate: hourlyRate > 0,
    };
  }, [timeEntries, userId, profile]);

  // If no hourly rate configured, show brief setup prompt
  if (!hasRate) {
    return (
      <div className="animate-fade-in rounded-2xl glass-card p-5 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-callout font-semibold tracking-tight mb-1">Min oversikt</h3>
            <p className="text-caption text-muted-foreground mb-3 leading-snug">
              Sett opp lønn i innstillinger for å se inntekt og overtid.
            </p>
            <button
              onClick={() => navigate("/settings")}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-caption text-primary font-medium rounded-lg bg-primary/5 hover:bg-primary/10 active:scale-[0.98] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              Gå til innstillinger
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in rounded-2xl glass-card p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-caption uppercase tracking-tight text-muted-foreground">
            Min oversikt
          </h3>
        </div>
      </div>

      {/* Two-column grid: week and month */}
      <div className="grid grid-cols-2 gap-3">
        {/* Denne uka */}
        <div>
          <p className="text-caption text-muted-foreground mb-2 tracking-tight">Denne uka</p>
          <p className="text-title font-semibold tabular-nums">
            {formatHours(weekNormalHours + weekOvertimeHours)}
          </p>
          {weekOvertimeHours > 0 && (
            <p className="text-[11px] text-muted-foreground tabular-nums mt-1 leading-snug">
              {formatHours(weekNormalHours, "short")} normal · {formatHours(weekOvertimeHours, "short")} overtid
            </p>
          )}
          <p className="text-headline font-semibold tabular-nums mt-3">
            {formatNok(weekNet)}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums leading-snug">
            brutto {formatNok(weekGross)}
          </p>
        </div>

        {/* Denne måneden */}
        <div>
          <p className="text-caption text-muted-foreground mb-2 tracking-tight">Denne måneden</p>
          <p className="text-title font-semibold tabular-nums">
            {formatHours(monthNormalHours + monthOvertimeHours)}
          </p>
          {monthOvertimeHours > 0 && (
            <p className="text-[11px] text-muted-foreground tabular-nums mt-1 leading-snug">
              {formatHours(monthNormalHours, "short")} normal · {formatHours(monthOvertimeHours, "short")} overtid
            </p>
          )}
          <p className="text-headline font-semibold tabular-nums mt-3">
            {formatNok(monthNet)}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums leading-snug">
            brutto {formatNok(monthGross)}
          </p>
        </div>
      </div>

      {/* Avspasering balance (if any) */}
      {avspaseringHours > 0 && (
        <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-caption text-muted-foreground tracking-tight">
            Avspaseringssaldo:
          </span>
          <span className="text-caption font-semibold tabular-nums">
            {formatHours(avspaseringHours)}
          </span>
        </div>
      )}
    </div>
  );
}
