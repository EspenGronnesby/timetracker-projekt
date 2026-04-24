import { useAuth, AppMode } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const useAppMode = () => {
  const { profile, user, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Backward-compat: eksisterende brukere kan ha "simple" i DB fra før migrering.
  // Behandle både "simple" og "light" som Light-modus. Migreringen normaliserer
  // dette på sikt, men koden skal fungere i mellomtiden.
  const isLightMode = profile?.app_mode === "light" || profile?.app_mode === "simple";

  const setAppMode = async (mode: AppMode) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ app_mode: mode })
      .eq("id", user.id);
    if (error) {
      // Typisk når DB-constraint ennå ikke er kjørt og det står "simple"
      // i DB, eller hvis constraint avviser nye verdier. Vis feilen tydelig.
      toast({
        variant: "destructive",
        title: "Kunne ikke bytte modus",
        description: error.message,
      });
      return;
    }
    // Profile ligger i lokal state i useAuth — må re-fetches eksplisitt
    // for at ModeToggle-segmentet og AppShell-redirecten skal reagere.
    await refetchProfile();
    navigate(mode === "light" ? "/simple" : "/app", { replace: true });
  };

  // Normaliser "simple" → "light" i returverdien så ModeToggle og andre
  // konsumenter kun ser kanoniske "light"/"pro".
  const normalizedMode: AppMode =
    profile?.app_mode === "pro" ? "pro" : "light";

  return { isLightMode, appMode: normalizedMode, setAppMode };
};
