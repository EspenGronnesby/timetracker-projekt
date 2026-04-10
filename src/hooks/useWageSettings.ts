import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface WageSettings {
  id: string;
  user_id: string;
  hourly_rate: number;
  overtime_threshold: number;
  overtime_multiplier: number;
  default_lunch_minutes: number;
  lunch_is_paid: boolean;
}

export const useWageSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["wage_settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wage_settings" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as WageSettings | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: Partial<WageSettings>) => {
      const payload = {
        user_id: user!.id,
        ...values,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("wage_settings" as any)
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wage_settings" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wage_settings"] });
    },
  });

  return { settings, isLoading, upsert: upsert.mutate, isSaving: upsert.isPending };
};
