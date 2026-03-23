import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type BreakType = "lunch_paid" | "lunch_unpaid" | "short_break";

export interface Break {
  id: string;
  time_entry_id: string;
  user_id: string;
  break_type: BreakType;
  start_time: string;
  end_time: string | null;
  is_paid: boolean;
  created_at: string;
}

export const useBreaks = (timeEntryId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: breaks = [] } = useQuery({
    queryKey: ["breaks", timeEntryId],
    enabled: !!timeEntryId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breaks" as any)
        .select("*")
        .eq("time_entry_id", timeEntryId!)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data || []) as Break[];
    },
  });

  const activeBreak = breaks.find((b) => !b.end_time);

  const startBreak = useMutation({
    mutationFn: async ({ breakType, isPaid }: { breakType: BreakType; isPaid: boolean }) => {
      if (!timeEntryId || !user) throw new Error("No active entry");
      const { error } = await supabase.from("breaks" as any).insert({
        time_entry_id: timeEntryId,
        user_id: user.id,
        break_type: breakType,
        start_time: new Date().toISOString(),
        is_paid: isPaid,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["breaks"] }),
  });

  const endBreak = useMutation({
    mutationFn: async () => {
      if (!activeBreak) return;
      const { error } = await supabase
        .from("breaks" as any)
        .update({ end_time: new Date().toISOString() })
        .eq("id", activeBreak.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["breaks"] }),
  });

  // Calculate total unpaid break seconds for wage calculation
  const totalUnpaidBreakSeconds = breaks
    .filter((b) => !b.is_paid && b.end_time)
    .reduce((sum, b) => {
      const start = new Date(b.start_time).getTime();
      const end = new Date(b.end_time!).getTime();
      return sum + Math.floor((end - start) / 1000);
    }, 0);

  return {
    breaks,
    activeBreak,
    startBreak: startBreak.mutate,
    endBreak: endBreak.mutate,
    totalUnpaidBreakSeconds,
  };
};
