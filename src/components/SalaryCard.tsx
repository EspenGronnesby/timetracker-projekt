import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TimeEntry } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, isWithinInterval } from "date-fns";
import { Wallet, Settings as SettingsIcon } from "lucide-react";
import { calculateSalary, formatNok, formatHours } from "@/lib/salary";

interface SalaryCardProps {
  timeEntries: TimeEntry[];
  userId: string;
}

/**
 * Fase 3: Viser "Min lønn" — brutto og netto for denne uka og måneden.
 * Bruker profile.hourly_rate_nok og profile.tax_percentage.
 *
 * Hvis brukeren ikke har satt timelønn, viser den en "sett opp"-knapp
 * som tar dem til Settings.
 */
export function SalaryCard({ timeEntries, userId }: SalaryCardProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { weekSeconds, monthSeconds } = useMemo(() => {
    const now = new Date();
    // Mandag som første ukedag (norsk standard)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    let weekSec = 0;
    let monthSec = 0;

    for (const entry of timeEntries) {
      if (entry.user_id !== userId || !entry.end_time) continue;
      const start = new Date(entry.start_time);
      if (isWithinInterval(start, { start: weekStart, end: weekEnd })) {
        weekSec += entry.duration_seconds;
      }
      if (isWithinInterval(start, { start: monthStart, end: monthEnd })) {
        monthSec += entry.duration_seconds;
      }
    }

    return { weekSeconds: weekSec, monthSeconds: monthSec };
  }, [timeEntries, userId]);

  const weekSalary = calculateSalary({
    totalSeconds: weekSeconds,
    hourlyRateNok: profile?.hourly_rate_nok,
    taxPercentage: profile?.tax_percentage,
  });

  const monthSalary = calculateSalary({
    totalSeconds: monthSeconds,
    hourlyRateNok: profile?.hourly_rate_nok,
    taxPercentage: profile?.tax_percentage,
  });

  // Ikke konfigurert → vis oppfordring
  if (!weekSalary.isConfigured) {
    return (
      <div className="rounded-2xl glass-card p-5 mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-callout font-semibold mb-1">Sett opp lønn</h3>
            <p className="text-caption text-muted-foreground mb-3">
              Skriv inn timelønn og skatteprosent for å se hvor mye du tjener.
            </p>
            <button
              onClick={() => navigate("/settings")}
              className="inline-flex items-center gap-1.5 text-caption text-primary font-medium pressable"
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
    <div className="rounded-2xl glass-card p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h3 className="text-caption uppercase tracking-wider text-muted-foreground">
            Min lønn
          </h3>
        </div>
        <button
          onClick={() => navigate("/settings")}
          className="text-muted-foreground hover:text-foreground transition-colors pressable"
          aria-label="Juster lønnsinnstillinger"
        >
          <SettingsIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {/* Denne uken */}
        <div className="rounded-xl border border-border/40 bg-background/40 p-4">
          <p className="text-xs uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">
            Denne uken
          </p>
          <p className="text-title font-semibold tabular-nums">
            {formatNok(weekSalary.netNok)}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums mt-1">
            {formatHours(weekSalary.hours)} · brutto {formatNok(weekSalary.grossNok)}
          </p>
        </div>

        {/* Denne måneden */}
        <div className="rounded-xl border border-border/40 bg-background/40 p-4">
          <p className="text-xs uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">
            Denne måneden
          </p>
          <p className="text-title font-semibold tabular-nums">
            {formatNok(monthSalary.netNok)}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums mt-1">
            {formatHours(monthSalary.hours)} · brutto {formatNok(monthSalary.grossNok)}
          </p>
        </div>
      </div>

      {profile?.tax_percentage != null && profile.tax_percentage > 0 && (
        <p className="text-[10px] text-muted-foreground/70 mt-3">
          Netto beregnet med {profile.tax_percentage}% skatt
        </p>
      )}
    </div>
  );
}
