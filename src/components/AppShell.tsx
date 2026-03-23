import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { StreakIndicator } from "@/components/StreakIndicator";
import { NotificationBell } from "@/components/NotificationBell";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { NavigationButton } from "@/components/NavigationButton";
import { ThemeToggle } from "@/components/ThemeToggle";

const pageTitles: Record<string, string> = {
  "/app": "",
  "/goals": "Notater",
  "/more": "Mer",
  "/settings": "Innstillinger",
  "/admin": "Admin",
  "/simple": "",
  "/simple/history": "Historikk",
  "/simple/wage": "Lønnsinnstillinger",
};

export function AppShell() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Redirect based on app mode
  useEffect(() => {
    if (!loading && user && profile) {
      const isSimple = profile.app_mode === "simple";
      if (isSimple && location.pathname === "/app") {
        navigate("/simple", { replace: true });
      } else if (!isSimple && location.pathname === "/simple") {
        navigate("/app", { replace: true });
      }
    }
  }, [user, loading, profile, location.pathname, navigate]);

  if (loading || !user) return null;

  const isHome = location.pathname === "/app" || location.pathname === "/simple";
  const title = isHome ? profile?.name : pageTitles[location.pathname] || "";

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 max-w-7xl mx-auto">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight truncate">
            {title}
          </h1>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isHome && <StreakIndicator />}
            {isHome && <NotificationBell />}
            <NavigationButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <OfflineIndicator />

      <main>
        <Outlet />
      </main>

      <BottomTabBar />
    </div>
  );
}
