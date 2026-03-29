import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export const useAppMode = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isSimpleMode = profile?.app_mode === "simple";

  const setAppMode = async (mode: "simple" | "pro") => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ app_mode: mode })
      .eq("id", user.id);
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    navigate(mode === "simple" ? "/simple" : "/app");
  };

  return { isSimpleMode, appMode: (profile?.app_mode || "simple") as "simple" | "pro", setAppMode };
};
