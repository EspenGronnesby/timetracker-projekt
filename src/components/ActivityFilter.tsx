import { Button } from "@/components/ui/button";
import { Users, Clock, Car, Package } from "lucide-react";

export type FilterType = "all" | "my" | "espen" | "benjamin" | "lukas" | "time" | "drive" | "material";

interface ActivityFilterProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export const ActivityFilter = ({ activeFilter, onFilterChange }: ActivityFilterProps) => {
  const filters: { value: FilterType; label: string; icon?: React.ReactNode }[] = [
    { value: "all", label: "Alle", icon: <Users className="h-4 w-4" /> },
    { value: "my", label: "Mine", icon: <Users className="h-4 w-4" /> },
    { value: "espen", label: "Espen" },
    { value: "benjamin", label: "Benjamin" },
    { value: "lukas", label: "Lukas" },
    { value: "time", label: "Tid", icon: <Clock className="h-4 w-4" /> },
    { value: "drive", label: "Kjøring", icon: <Car className="h-4 w-4" /> },
    { value: "material", label: "Materialer", icon: <Package className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
          className="flex items-center gap-2"
        >
          {filter.icon}
          {filter.label}
        </Button>
      ))}
    </div>
  );
};
