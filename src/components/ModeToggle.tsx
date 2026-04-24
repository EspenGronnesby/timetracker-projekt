import { Zap, Crown } from "lucide-react";
import { useAppMode } from "@/hooks/useAppMode";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// Segmented pill i app-header. Viser begge moduser side om side;
// klikk på den inaktive segment bytter. Dette er mer intuitivt enn
// en enkelt-knapp fordi brukeren umiddelbart ser hvor de er og hvor
// de kan gå.
export function ModeToggle() {
  const { appMode, setAppMode } = useAppMode();
  const isLight = appMode === "light";

  const handleSelect = (target: "light" | "pro") => {
    if (target === appMode) return;
    haptic("light");
    setAppMode(target);
  };

  return (
    <div
      role="tablist"
      aria-label="App-modus"
      className="flex items-center gap-0.5 h-10 sm:h-9 p-0.5 rounded-full bg-muted/50"
    >
      <button
        role="tab"
        aria-selected={isLight}
        aria-label="Light-modus"
        onClick={() => handleSelect("light")}
        className={cn(
          "flex items-center gap-1 h-9 sm:h-8 px-2.5 rounded-full text-[11px] font-semibold tracking-tight transition-all duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          isLight
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground active:scale-[0.96] motion-reduce:active:scale-100"
        )}
      >
        <Zap className={cn("h-3.5 w-3.5", isLight && "text-primary")} />
        <span className="hidden sm:inline">Light</span>
      </button>
      <button
        role="tab"
        aria-selected={!isLight}
        aria-label="Pro-modus"
        onClick={() => handleSelect("pro")}
        className={cn(
          "flex items-center gap-1 h-9 sm:h-8 px-2.5 rounded-full text-[11px] font-semibold tracking-tight transition-all duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          !isLight
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground active:scale-[0.96] motion-reduce:active:scale-100"
        )}
      >
        <Crown className={cn("h-3.5 w-3.5", !isLight && "text-primary")} />
        <span className="hidden sm:inline">Pro</span>
      </button>
    </div>
  );
}
