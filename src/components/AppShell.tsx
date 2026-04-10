import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { NotificationBell } from "@/components/NotificationBell";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { NavigationButton } from "@/components/NavigationButton";

const pageTitles: Record<string, string> = {
  "/app": "",
  "/overview": "Min oversikt",
  "/goals": "Notater",
  "/more": "Mer",
  "/more/profile": "Profil",
  "/more/work": "Arbeid & Lønn",
  "/more/appearance": "Utseende",
  "/more/notifications": "Varsler",
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
  // Fase 2: StreakIndicator fjernet (markert som støy i audit-fase-0.md).
  // NotificationBell vises kun i pro-modus (team-brukere), ikke i light-modus.
  const showNotificationBell = isHome && profile?.app_mode !== "light";
  // Vis tilbake-pil på alle undersider under /more/* (ikke selve /more)
  const showBackButton = location.pathname.startsWith("/more/");

  return (
    <div className="min-h-screen bg-background pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <header className="border-b border-border/30 bg-background/70 backdrop-blur-xl backdrop-saturate-150 py-2.5 sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {showBackButton && (
              <button
                onClick={() => navigate("/more")}
                aria-label="Tilbake til Mer"
                className="flex items-center justify-center h-10 w-10 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-[0.96] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-lg font-semibold tracking-tight truncate">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {showNotificationBell && <NotificationBell />}
            <NavigationButton />
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
