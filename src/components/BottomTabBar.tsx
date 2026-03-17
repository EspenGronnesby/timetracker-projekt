import { useLocation, useNavigate } from "react-router-dom";
import { Home, StickyNote, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/app", label: "Hjem", icon: Home },
  { path: "/goals", label: "Notater", icon: StickyNote },
  { path: "/more", label: "Mer", icon: MoreHorizontal },
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const moreRoutes = ["/more", "/settings", "/admin"];
          const isActive =
            tab.path === "/app"
              ? location.pathname === "/app"
              : tab.path === "/more"
              ? moreRoutes.some((r) => location.pathname.startsWith(r))
              : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
