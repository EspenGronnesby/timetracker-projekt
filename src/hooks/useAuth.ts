import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type AppMode = "light" | "pro";

interface Profile {
  id: string;
  name: string;
  organization_number: string | null;
  organization_name: string | null;
  show_team_invite?: boolean;
  show_project_actions?: boolean;
  show_activity_log?: boolean;
  color_theme?: string;
  show_cost_calculator?: boolean;
  show_weather_widget?: boolean;
  show_weather_notifications?: boolean;
  app_mode?: string;
  // Fase 2: Notater-toggle
  show_notes?: boolean;
  hourly_rate_nok?: number | null;
  tax_percentage?: number | null;
  tax_method?: "manual" | "auto";
  // Fase 5a: Normal arbeidstid for overtidsberegning
  normal_hours_per_day?: number | null;
  normal_hours_per_week?: number | null;
  // Fase 5a.2: Standard arbeidsdag
  default_start_time?: string | null;
  default_end_time?: string | null;
  default_breakfast_time?: string | null;
  default_lunch_time?: string | null;
  default_breakfast_min?: number | null;
  default_lunch_min?: number | null;
  // Fase 6: Automatisk tidsplan — start/pause/stopp timer automatisk
  auto_schedule_enabled?: boolean;
  // Ukedager auto-schedule kjører på (0=søn, 1=man, ..., 6=lør)
  auto_schedule_days?: number[] | null;
  // Kjøring-kort på Min oversikt (skjulbart, default true)
  show_driving_card?: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Profile via React Query så cachen deles på tvers av alle useAuth-
  // instanser. Uten dette har hver komponent sin egen profile-kopi og
  // refetch i én hook påvirker ikke de andre.
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  });

  const loading = authLoading || (!!user && profileLoading);

  // Invaliderer den delte React Query-cachen. Alle komponenter som
  // bruker useAuth får automatisk ny profile gjennom sin egen useQuery.
  const refetchProfile = useCallback(async () => {
    if (!user) return;
    await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
  }, [user, queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    // Clear hele query-cachen så ingen rester (profile, projects, time_entries,
    // drive_entries, materials) fra forrige bruker vises ved neste innlogging.
    queryClient.clear();
    navigate("/auth");
  };

  return {
    user,
    session,
    profile: profile ?? null,
    loading,
    signOut,
    refetchProfile,
  };
};