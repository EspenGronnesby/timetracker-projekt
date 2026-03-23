import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWageSettings } from "@/hooks/useWageSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, eachDayOfInterval } from "date-fns";
import { nb } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const SimpleHistory = () => {
  const { user } = useAuth();
  const { settings: wage } = useWageSettings();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Fetch all time entries for the month
  const { data: entries = [] } = useQuery({
    queryKey: ["simple_history", user?.id, monthStart.toISOString()],
    enabled: !!user,
    queryFn: async () => {
      // Get simple project
      const { data: members } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user!.id)
        .eq("role", "owner");

      if (!members?.length) return [];

      const projectIds = members.map((m) => m.project_id);
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .in("id", projectIds)
        .eq("name", "Standard arbeidsdag");

      if (!projects?.length) return [];

      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", user!.id)
        .eq("project_id", projects[0].id)
        .gte("start_time", monthStart.toISOString())
        .lte("start_time", monthEnd.toISOString())
        .not("end_time", "is", null)
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Group entries by day
  const dayMap = useMemo(() => {
    const map = new Map<string, typeof entries>();
    entries.forEach((e) => {
      const key = format(new Date(e.start_time), "yyyy-MM-dd");
      const arr = map.get(key) || [];
      arr.push(e);
      map.set(key, arr);
    });
    return map;
  }, [entries]);

  const threshold = (wage?.overtime_threshold || 7.5) * 3600;
  const rate = wage?.hourly_rate || 0;
  const multiplier = wage?.overtime_multiplier || 1.5;

  const getDayTotal = (dateKey: string) => {
    const dayEntries = dayMap.get(dateKey) || [];
    return dayEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0);
  };

  // Calendar day styling
  const getDayStyle = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const total = getDayTotal(key);
    if (total === 0) return "";
    if (total > threshold) return "bg-yellow-500/20 text-yellow-500 font-bold";
    return "bg-green-500/20 text-green-500 font-bold";
  };

  // Selected day details
  const selectedDayKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedDayEntries = selectedDayKey ? dayMap.get(selectedDayKey) || [] : [];
  const selectedDayTotal = selectedDayKey ? getDayTotal(selectedDayKey) : 0;

  // Month totals
  const monthTotalSeconds = Array.from(dayMap.values()).reduce(
    (sum, dayEntries) => sum + dayEntries.reduce((s, e) => s + (e.duration_seconds || 0), 0),
    0
  );
  const monthDays = dayMap.size;
  const monthNormal = Math.min(monthTotalSeconds, monthDays * threshold);
  const monthOvertime = Math.max(0, monthTotalSeconds - monthDays * threshold);

  const formatHM = (s: number) => `${Math.floor(s / 3600)}t ${Math.floor((s % 3600) / 60)}min`;
  const formatMoney = (n: number) =>
    new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="py-6 px-4 max-w-lg mx-auto space-y-4">
      {/* Calendar */}
      <Card className="p-4">
        <Calendar
          mode="single"
          selected={selectedDay || undefined}
          onSelect={(d) => setSelectedDay(d || null)}
          month={selectedMonth}
          onMonthChange={setSelectedMonth}
          locale={nb}
          modifiers={{
            worked: (date) => getDayTotal(format(date, "yyyy-MM-dd")) > 0,
            overtime: (date) => getDayTotal(format(date, "yyyy-MM-dd")) > threshold,
          }}
          modifiersClassNames={{
            worked: "bg-green-500/20 text-green-600 dark:text-green-400 font-semibold",
            overtime: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-semibold",
          }}
          className="w-full"
        />

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-center">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500/30" /> Normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500/30" /> Overtid
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-muted" /> Ikke registrert
          </span>
        </div>
      </Card>

      {/* Selected day details */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">
                {format(selectedDay, "EEEE d. MMMM", { locale: nb })}
              </h3>

              {selectedDayEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ingen registreringer denne dagen</p>
              ) : (
                <>
                  {selectedDayEntries.map((e) => (
                    <div key={e.id} className="flex justify-between text-sm border-b border-border pb-2">
                      <span>
                        {format(new Date(e.start_time), "HH:mm")} – {e.end_time ? format(new Date(e.end_time), "HH:mm") : "pågår"}
                      </span>
                      <span className="font-mono tabular-nums">{formatHM(e.duration_seconds || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-1">
                    <span>Totalt</span>
                    <span className={cn(selectedDayTotal > threshold && "text-yellow-500")}>
                      {formatHM(selectedDayTotal)}
                    </span>
                  </div>
                  {rate > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Estimert lønn</span>
                      <span>
                        {formatMoney(
                          (Math.min(selectedDayTotal, threshold) / 3600) * rate +
                          (Math.max(0, selectedDayTotal - threshold) / 3600) * rate * multiplier
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Month summary */}
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">{format(selectedMonth, "MMMM yyyy", { locale: nb })}</h3>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Arbeidsdager</span>
          <span>{monthDays}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total arbeidstid</span>
          <span className="font-mono tabular-nums">{formatHM(monthTotalSeconds)}</span>
        </div>
        {rate > 0 && (
          <div className="flex justify-between font-semibold border-t border-border pt-2">
            <span>Estimert månedslønn</span>
            <span>
              {formatMoney(
                (monthNormal / 3600) * rate + (monthOvertime / 3600) * rate * multiplier
              )}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SimpleHistory;
