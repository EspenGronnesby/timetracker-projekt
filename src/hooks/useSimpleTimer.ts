import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWageSettings } from "@/hooks/useWageSettings";
import { useBreaks } from "@/hooks/useBreaks";
import { LIGHT_MODE_PROJECT_NAME } from "@/lib/projectConstants";

const SIMPLE_PROJECT_NAME = LIGHT_MODE_PROJECT_NAME;
const SIMPLE_PROJECT_COLOR = "#3B82F6";

export const useSimpleTimer = () => {
  const { user, profile } = useAuth();
  const { settings: wageSettings } = useWageSettings();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());

  // Get or create "Standard arbeidsdag" project
  const { data: simpleProject } = useQuery({
    queryKey: ["simple_project", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Find existing simple project owned by user
      const { data: members } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user!.id)
        .eq("role", "owner");

      if (members && members.length > 0) {
        const projectIds = members.map((m) => m.project_id);
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .in("id", projectIds)
          .eq("name", SIMPLE_PROJECT_NAME)
          .limit(1);

        if (projects && projects.length > 0) return projects[0];
      }

      // Create one via RPC
      const { data, error } = await supabase.rpc("create_project", {
        p_name: SIMPLE_PROJECT_NAME,
        p_color: SIMPLE_PROJECT_COLOR,
        p_customer_name: profile?.name || "Personlig",
        p_customer_address: "",
        p_customer_phone: "",
        p_customer_email: "",
        p_contract_number: "",
        p_description: "Automatisk opprettet for Enkel-modus",
        p_hide_customer_info: true,
      });
      if (error) throw error;
      return data;
    },
  });

  // Active time entry (no end_time).
  //
  // Tidligere polling hver 5s → 10 åpne tabs = 50 req/sek, unødvendig
  // på mobilnettverk ute i felten. Nå: Realtime-subscription på
  // time_entries for innlogget bruker, med en mild failsafe-refetch
  // hvert 60s i tilfelle WebSocket-forbindelsen mistes.
  const { data: activeEntry } = useQuery({
    queryKey: ["simple_active_entry", user?.id],
    enabled: !!user && !!simpleProject,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", user!.id)
        .eq("project_id", simpleProject!.id)
        .is("end_time", null)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Realtime: invaliderer queryen så snart en time_entries-rad for
  // denne brukeren endres (INSERT/UPDATE/DELETE). Krever at time_entries
  // er med i supabase_realtime-publikasjonen — det er den allerede.
  useEffect(() => {
    if (!user || !simpleProject) return;
    const channel = supabase
      .channel(`simple-timer-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_entries",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["simple_active_entry", user.id] });
          queryClient.invalidateQueries({ queryKey: ["simple_today_entries", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, simpleProject, queryClient]);

  // Today's completed entries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayEntries = [] } = useQuery({
    queryKey: ["simple_today_entries", user?.id, todayStart.toISOString()],
    enabled: !!user && !!simpleProject,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", user!.id)
        .eq("project_id", simpleProject!.id)
        .gte("start_time", todayStart.toISOString())
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { breaks, activeBreak, startBreak, endBreak, totalUnpaidBreakSeconds } =
    useBreaks(activeEntry?.id);

  // Tick every second when timer is running
  useEffect(() => {
    if (!activeEntry || activeBreak) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeEntry, activeBreak]);

  // Calculate current session seconds
  const currentSessionSeconds = activeEntry
    ? Math.floor((now - new Date(activeEntry.start_time).getTime()) / 1000)
    : 0;

  // Calculate today total seconds (completed + current active)
  const completedTodaySeconds = todayEntries
    .filter((e) => e.end_time)
    .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);

  const todaySeconds = completedTodaySeconds + (activeEntry ? currentSessionSeconds : 0);

  // Wage calculations
  const rate = wageSettings?.hourly_rate || 0;
  const threshold = (wageSettings?.overtime_threshold || 7.5) * 3600;
  const multiplier = wageSettings?.overtime_multiplier || 1.5;

  const workSeconds = todaySeconds - totalUnpaidBreakSeconds;
  const normalSeconds = Math.min(workSeconds, threshold);
  const overtimeSeconds = Math.max(0, workSeconds - threshold);

  const normalWage = (normalSeconds / 3600) * rate;
  const overtimeWage = (overtimeSeconds / 3600) * rate * multiplier;
  const totalWage = normalWage + overtimeWage;

  const isRunning = !!activeEntry && !activeBreak;
  const isPaused = !!activeEntry && !!activeBreak;
  const isOvertime = workSeconds > threshold;

  // Status
  const status: "ready" | "working" | "paused" | "done" =
    activeEntry ? (activeBreak ? "paused" : "working") : completedTodaySeconds > 0 ? "done" : "ready";

  const startTimer = useMutation({
    mutationFn: async () => {
      if (!user || !simpleProject) throw new Error("Not ready");
      const { error } = await supabase.from("time_entries").insert({
        project_id: simpleProject.id,
        user_id: user.id,
        user_name: profile?.name || "Bruker",
        start_time: new Date().toISOString(),
        is_manual: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simple_active_entry"] });
      queryClient.invalidateQueries({ queryKey: ["simple_today_entries"] });
    },
  });

  const stopTimer = useMutation({
    mutationFn: async () => {
      if (!activeEntry) return;
      // End any active break first
      if (activeBreak) {
        await supabase
          .from("breaks" as any)
          .update({ end_time: new Date().toISOString() })
          .eq("id", activeBreak.id);
      }
      const endTime = new Date();
      const duration = Math.floor(
        (endTime.getTime() - new Date(activeEntry.start_time).getTime()) / 1000
      );
      const { error } = await supabase
        .from("time_entries")
        .update({
          end_time: endTime.toISOString(),
          duration_seconds: duration,
        })
        .eq("id", activeEntry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simple_active_entry"] });
      queryClient.invalidateQueries({ queryKey: ["simple_today_entries"] });
      queryClient.invalidateQueries({ queryKey: ["breaks"] });
    },
  });

  return {
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
    activeEntry,
    activeBreak,
    breaks,
    startTimer: startTimer.mutate,
    stopTimer: stopTimer.mutate,
    startBreak,
    endBreak,
    isStarting: startTimer.isPending,
    isStopping: stopTimer.isPending,
    simpleProjectId: simpleProject?.id,
  };
};
