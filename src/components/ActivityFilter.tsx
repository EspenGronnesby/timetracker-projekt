import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

export type FilterPeriod = "day" | "week" | "month" | "custom";

interface ActivityFilterProps {
  onFilterChange: (period: FilterPeriod, customRange?: { from: Date; to: Date }) => void;
}

export const ActivityFilter = ({ onFilterChange }: ActivityFilterProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>("week");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const handlePeriodChange = (period: FilterPeriod) => {
    setSelectedPeriod(period);
    if (period !== "custom") {
      setCustomRange(undefined);
      onFilterChange(period);
    }
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      setSelectedPeriod("custom");
      onFilterChange("custom", { from: range.from, to: range.to });
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-2 flex-wrap">
      <Button
        variant={selectedPeriod === "day" ? "default" : "outline"}
        size="default"
        onClick={() => handlePeriodChange("day")}
        className="text-sm sm:text-sm px-4 sm:px-3 h-11 sm:h-10"
      >
        <span className="hidden xs:inline">Day</span>
        <span className="xs:hidden">D</span>
      </Button>
      <Button
        variant={selectedPeriod === "week" ? "default" : "outline"}
        size="default"
        onClick={() => handlePeriodChange("week")}
        className="text-sm sm:text-sm px-4 sm:px-3 h-11 sm:h-10"
      >
        <span className="hidden xs:inline">Week</span>
        <span className="xs:hidden">W</span>
      </Button>
      <Button
        variant={selectedPeriod === "month" ? "default" : "outline"}
        size="default"
        onClick={() => handlePeriodChange("month")}
        className="text-sm sm:text-sm px-4 sm:px-3 h-11 sm:h-10"
      >
        <span className="hidden xs:inline">Month</span>
        <span className="xs:hidden">M</span>
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={selectedPeriod === "custom" ? "default" : "outline"}
            size="default"
            className={cn("gap-1 sm:gap-2 text-sm sm:text-sm px-4 sm:px-3 h-11 sm:h-10")}
          >
            <CalendarIcon className="h-4 w-4 sm:h-4 sm:w-4" />
            {selectedPeriod === "custom" && customRange?.from && customRange?.to ? (
              <span className="hidden sm:inline">
                {format(customRange.from, "MMM d")} - {format(customRange.to, "MMM d")}
              </span>
            ) : (
              <>
                <span className="hidden xs:inline">Custom</span>
                <span className="xs:hidden">C</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={handleCustomRangeSelect}
            numberOfMonths={1}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
