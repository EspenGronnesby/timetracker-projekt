import { Search, SortAsc } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchAndSortProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

export function SearchAndSort({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: SearchAndSortProps) {
  return (
    <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6 flex-col sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Søk etter prosjekter..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 sm:pl-9 text-sm"
        />
      </div>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-full sm:w-[200px] text-sm">
          <SortAsc className="h-4 w-4 mr-2 flex-shrink-0" />
          <SelectValue placeholder="Sorter etter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Navn</SelectItem>
          <SelectItem value="time">Total tid</SelectItem>
          <SelectItem value="active">Aktive først</SelectItem>
          <SelectItem value="recent">Nyligst</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
