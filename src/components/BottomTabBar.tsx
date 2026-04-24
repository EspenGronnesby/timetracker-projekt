import { useLocation, useNavigate } from "react-router-dom";
import { Home, StickyNote, MoreHorizontal, Clock, CalendarDays, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
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

  // Backward-compat: "simple" var det gamle navnet på samme verdi.
  const isLight =
    profile?.app_mode === "light" || profile?.app_mode === "simple";

  // Fase 2: "Notater"-fanen vises kun hvis show_notes-toggle er på i profilen.
  const tabs = isLight
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
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full select-none pressable transition-colors duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              {/* Animated active pill — glides between tabs via shared layoutId */}
              <div className="relative flex items-center justify-center h-7 w-12">
                {isActive && (
                  <motion.span
                    layoutId="bottom-tab-pill"
                    className="absolute inset-0 rounded-full bg-primary/12"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    aria-hidden
                  />
                )}
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] relative transition-transform duration-200 motion-reduce:transition-none",
                    isActive && "stroke-[2.5] scale-110"
                  )}
                />
              </div>
              <span className={cn(
                "text-[11px] font-medium transition-colors duration-200",
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