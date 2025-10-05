import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export type FilterPeriod = "day" | "week" | "month" | "custom";

interface ActivityFilterProps {
  onFilterChange: (period: FilterPeriod, customRange?: { from: Date; to: Date }) => void;
}

export const ActivityFilter = ({ onFilterChange }: ActivityFilterProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>("week");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | undefined>();

  const handlePeriodChange = (period: FilterPeriod) => {
    setSelectedPeriod(period);
    if (period !== "custom") {
      onFilterChange(period);
    }
  };

  const handleCustomRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setCustomRange({ from: range.from, to: range.to });
      onFilterChange("custom", { from: range.from, to: range.to });
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant={selectedPeriod === "day" ? "default" : "outline"}
        size="sm"
        onClick={() => handlePeriodChange("day")}
      >
        Day
      </Button>
      <Button
        variant={selectedPeriod === "week" ? "default" : "outline"}
        size="sm"
        onClick={() => handlePeriodChange("week")}
      >
        Week
      </Button>
      <Button
        variant={selectedPeriod === "month" ? "default" : "outline"}
        size="sm"
        onClick={() => handlePeriodChange("month")}
      >
        Month
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={selectedPeriod === "custom" ? "default" : "outline"}
            size="sm"
            className={cn("gap-2")}
          >
            <CalendarIcon className="h-4 w-4" />
            {selectedPeriod === "custom" && customRange
              ? `${format(customRange.from, "MMM d")} - ${format(customRange.to, "MMM d")}`
              : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={handleCustomRangeSelect}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
