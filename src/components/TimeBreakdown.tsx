import { Clock, TrendingUp, Calendar, BarChart3 } from "lucide-react";
import { formatCompactTime } from "@/lib/analyticsUtils";

interface TimeBreakdownProps {
  day: number;
  week: number;
  month: number;
  total: number;
}

export const TimeBreakdown = ({ day, week, month, total }: TimeBreakdownProps) => {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          <span>D:</span>
        </div>
        <span className="font-medium">{formatCompactTime(day)}</span>
        
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3" />
          <span>W:</span>
        </div>
        <span className="font-medium">{formatCompactTime(week)}</span>
        
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3 w-3" />
          <span>M:</span>
        </div>
        <span className="font-medium">{formatCompactTime(month)}</span>
      </div>
      
      <div className="flex items-center gap-1.5 pt-1 border-t border-border">
        <Clock className="h-3 w-3" />
        <span>Total:</span>
        <span className="font-semibold text-foreground">{formatCompactTime(total)}</span>
      </div>
    </div>
  );
};
