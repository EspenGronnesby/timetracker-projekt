import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Flame } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const StreakIndicator = () => {
  const { user } = useAuth();

  const { data: streak } = useQuery({
    queryKey: ['user-streak', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  if (!streak || streak.current_streak === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 bg-orange-500/10 dark:bg-orange-500/20 px-3 py-1.5 rounded-full cursor-pointer hover:bg-orange-500/20 dark:hover:bg-orange-500/30 transition-colors">
            <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
            <span className="font-bold text-orange-500 text-sm">
              {streak.current_streak}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{streak.current_streak} dagers streak! 🔥</p>
          <p className="text-xs text-muted-foreground">Lengste streak: {streak.longest_streak} dager</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
