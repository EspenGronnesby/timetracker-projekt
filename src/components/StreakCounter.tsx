import { Flame } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StreakCounterProps {
  streak: number;
}

export const StreakCounter = ({ streak }: StreakCounterProps) => {
  if (streak === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-semibold">{streak}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{streak} day streak! Keep it up!</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
