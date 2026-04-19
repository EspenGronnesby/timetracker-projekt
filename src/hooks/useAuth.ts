import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
  // Kjøring-kort på Min oversikt (skjulbart, default true)
  show_driving_card?: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    navigate("/auth");
  };

  return {
    user,
    session,
    profile,
    loading,
    signOut,
  };
};