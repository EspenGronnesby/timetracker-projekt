import { Button } from "@/components/ui/button";

export type FilterType = "espen" | "benjamin" | "lukas";

interface ActivityFilterProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export const ActivityFilter = ({ activeFilter, onFilterChange }: ActivityFilterProps) => {
  const filters: { value: FilterType; label: string }[] = [
    { value: "espen", label: "Espen" },
    { value: "benjamin", label: "Benjamin" },
    { value: "lukas", label: "Lukas" },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
};
