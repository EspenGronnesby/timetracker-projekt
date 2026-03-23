import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const useAppMode = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const isSimpleMode = (profile as any)?.app_mode === "simple";

  const setAppMode = async (mode: "simple" | "pro") => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ app_mode: mode } as any)
      .eq("id", user.id);
    // Force re-fetch profile
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    // Reload to apply mode change across app
    window.location.href = mode === "simple" ? "/simple" : "/app";
  };

  return { isSimpleMode, appMode: (profile as any)?.app_mode || "simple", setAppMode };
};
