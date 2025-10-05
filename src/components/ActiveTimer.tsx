import { useEffect, useState } from "react";
import { getTotalSeconds } from "@/lib/timeUtils";
import { formatCompactTime } from "@/lib/analyticsUtils";

interface ActiveTimerProps {
  startTime: Date;
  color?: string;
}

export const ActiveTimer = ({ startTime, color = "hsl(var(--primary))" }: ActiveTimerProps) => {
  const [elapsed, setElapsed] = useState(() => getTotalSeconds(startTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(getTotalSeconds(startTime));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span 
        className="w-2 h-2 rounded-full animate-pulse" 
        style={{ backgroundColor: color }}
      />
      <span className="font-medium" style={{ color }}>
        {formatCompactTime(elapsed)}
      </span>
    </div>
  );
};
