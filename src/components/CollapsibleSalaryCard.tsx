import { TimeEntry } from "@/hooks/useProjects";
import { useUserStorage } from "@/hooks/useUserStorage";
import { SalaryCard } from "@/components/SalaryCard";
import { Wallet, Eye, EyeOff } from "lucide-react";

interface CollapsibleSalaryCardProps {
  timeEntries: TimeEntry[];
  userId: string;
}

// Wrapper rundt SalaryCard. Default kollapset så dashboardet ikke
// drukner i tall før bruker har lyst å se dem. Valget persisteres
// per bruker via useUserStorage.
export function CollapsibleSalaryCard({ timeEntries, userId }: CollapsibleSalaryCardProps) {
  const [expanded, setExpanded] = useUserStorage<boolean>(userId, "salary_expanded", false);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        aria-label="Vis min lønn"
        className="w-full rounded-2xl border border-border/40 bg-card/60 p-4 flex items-center justify-between hover:bg-muted/30 active:scale-[0.99] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold tracking-tight">Min lønn</p>
            <p className="text-xs text-muted-foreground">Trykk for å vise</p>
          </div>
        </div>
        <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>
    );
  }

  return (
    <div className="relative">
      <SalaryCard timeEntries={timeEntries} userId={userId} />
      <button
        onClick={() => setExpanded(false)}
        aria-label="Skjul min lønn"
        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted/60 active:scale-[0.96] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
