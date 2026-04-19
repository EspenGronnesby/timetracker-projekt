import { useLocation, useNavigate } from "react-router-dom";
import { Home, StickyNote, MoreHorizontal, Clock, CalendarDays, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/hooks/useAuth";

const proTabs = [
  { path: "/app", label: "Hjem", icon: Home },
  { path: "/overview", label: "Oversikt", icon: BarChart3 },
  { path: "/goals", label: "Notater", icon: StickyNote, requiresFlag: "show_notes" as const },
  { path: "/more", label: "Mer", icon: MoreHorizontal },
];

const simpleTabs = [
  { path: "/simple", label: "Timer", icon: Clock },
  { path: "/simple/history", label: "Historikk", icon: CalendarDays },
  { path: "/more", label: "Mer", icon: MoreHorizontal },
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isSimple = profile?.app_mode === "simple";

  // Fase 2: "Notater"-fanen vises kun hvis show_notes-toggle er på i profilen.
  const tabs = isSimple
    ? simpleTabs
    : proTabs.filter((tab) => {
        if (!tab.requiresFlag) return true;
        return profile?.[tab.requiresFlag] === true;
      });

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border/30 bg-background/80 backdrop-blur-xl backdrop-saturate-150 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const moreRoutes = ["/more", "/admin", "/simple/wage"];
          const isActive =
            tab.path === "/app"
              ? location.pathname === "/app"
              : tab.path === "/simple"
              ? location.pathname === "/simple"
              : tab.path === "/overview"
              ? location.pathname === "/overview"
              : tab.path === "/more"
              ? moreRoutes.some((r) => location.pathname.startsWith(r))
              : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => { navigate(tab.path); haptic("light"); }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full select-none pressable transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-[22px] w-[22px] transition-all duration-200",
                  isActive && "stroke-[2.5] scale-105"
                )}
              />
              <span className={cn(
                "text-[11px] transition-all duration-200 font-medium opacity-100",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/60"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}