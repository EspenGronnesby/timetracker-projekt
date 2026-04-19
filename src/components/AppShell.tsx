import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAutoScheduler } from "@/hooks/useAutoScheduler";
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

// Ruter som er bunn-tabber — skal IKKE ha tilbake-knapp
const TAB_ROOT_ROUTES = ["/app", "/simple", "/simple/history", "/goals", "/more"];

export function AppShell() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fase 6: Automatisk tidsplan. Mounter alltid, hooken no-op'er hvis ikke aktivert.
  useAutoScheduler();

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
  const isSimple = profile?.app_mode === "simple" || profile?.app_mode === "light";
  // Tittel: hjem viser brukernavn, /project/:id får generisk fallback
  const projectDetailTitle = location.pathname.startsWith("/project/") ? "Prosjekt" : "";
  const title = isHome
    ? profile?.name
    : pageTitles[location.pathname] || projectDetailTitle;
  // NotificationBell vises på hjem-sidene (også i enkel modus for værvarsler)
  const showNotificationBell = isHome;
  // Vis tilbake-pil på alle undersider som ikke er bunn-tab-ruter
  const showBackButton = !TAB_ROOT_ROUTES.includes(location.pathname);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isSimple ? "/simple" : "/app");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <header className="border-b border-border/30 bg-background/70 backdrop-blur-xl backdrop-saturate-150 py-2.5 sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {showBackButton && (
              <button
                onClick={handleBack}
                aria-label="Tilbake"
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
            {!isSimple && <NavigationButton />}
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
