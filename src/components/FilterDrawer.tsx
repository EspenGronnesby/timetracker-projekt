import { useState } from "react";
import { SlidersHorizontal, LayoutGrid, List, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ActivityFilter, FilterPeriod } from "@/components/ActivityFilter";
import { cn } from "@/lib/utils";

type ProjectStatus = "active" | "completed" | "all";
type SortOption = "name" | "time" | "active" | "recent";

interface FilterDrawerProps {
  projectStatus: ProjectStatus;
  onStatusChange: (status: ProjectStatus) => void;
  activeCount: number;
  completedCount: number;
  totalCount: number;
  filterPeriod: FilterPeriod;
  onFilterChange: (period: FilterPeriod, range?: { from: Date; to: Date }) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "name", label: "Navn" },
  { value: "time", label: "Total tid" },
  { value: "active", label: "Aktive først" },
  { value: "recent", label: "Nyligst" },
];

export function FilterDrawer({
  projectStatus,
  onStatusChange,
  activeCount,
  completedCount,
  totalCount,
  filterPeriod,
  onFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: FilterDrawerProps) {
  const [resetKey, setResetKey] = useState(0);

  const activeFilterCount =
    (projectStatus !== "active" ? 1 : 0) +
    (filterPeriod !== "week" ? 1 : 0) +
    (sortBy !== "name" ? 1 : 0);

  const handleReset = () => {
    onStatusChange("active");
    onFilterChange("week");
    onSortChange("name");
    setResetKey((k) => k + 1);
  };

  return (
    <div className="flex items-center gap-2">
      {/* View toggle — alltid synlig */}
      <div className="flex gap-1">
        <Button
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="icon"
          onClick={() => onViewModeChange("grid")}
          className="h-9 w-9"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "ghost"}
          size="icon"
          onClick={() => onViewModeChange("list")}
          className="h-9 w-9"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter-knapp */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 relative">
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle>Filter og sortering</SheetTitle>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Tilbakestill
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Status */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Status</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={projectStatus === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onStatusChange("active")}
                >
                  Aktive ({activeCount})
                </Button>
                <Button
                  variant={projectStatus === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onStatusChange("completed")}
                >
                  Fullførte ({completedCount})
                </Button>
                <Button
                  variant={projectStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onStatusChange("all")}
                >
                  Alle ({totalCount})
                </Button>
              </div>
            </div>

            {/* Tidsperiode */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Tidsperiode</p>
              <ActivityFilter key={resetKey} onFilterChange={onFilterChange} />
            </div>

            {/* Sortering */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Sorter etter</p>
              <div className="flex gap-2 flex-wrap">
                {sortOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={sortBy === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSortChange(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
