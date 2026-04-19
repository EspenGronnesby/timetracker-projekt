import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useAppMode } from "@/hooks/useAppMode";
import { User, Briefcase, Palette, Bell, BarChart3, Shield, LogOut, ChevronRight, Zap, Crown, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  destructive?: boolean;
}

function MenuItem({ icon, label, description, onClick, destructive }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 w-full min-h-[56px] p-4 rounded-2xl text-left",
        "transition-colors duration-150 motion-reduce:transition-none",
        "hover:bg-accent/50 active:bg-accent/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        destructive && "text-destructive hover:bg-destructive/10 active:bg-destructive/20"
      )}
    >
      <div className={cn(
        "flex items-center justify-center h-11 w-11 rounded-xl flex-shrink-0",
        destructive ? "bg-destructive/10" : "bg-muted/60"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold tracking-tight">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      {!destructive && <ChevronRight className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />}
    </button>
  );
}

export default function More() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { appMode, setAppMode } = useAppMode();

  return (
    <div className="py-6 px-4 sm:px-6 max-w-lg mx-auto space-y-4 animate-fade-in">
      {/* App-modus — øverst fordi det er den viktigste innstillingen */}
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="h-4 w-4 text-primary" />
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            App-modus
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => appMode !== "simple" && setAppMode("simple")}
            className={cn(
              "flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              appMode === "simple"
                ? "border-primary bg-primary/5"
                : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2">
              <Zap className={cn("h-4 w-4", appMode === "simple" ? "text-primary" : "text-muted-foreground")} />
              <span className="font-semibold text-sm tracking-tight">Enkel</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Stoppeklokke + logg vanlig dag
            </p>
          </button>

          <button
            onClick={() => appMode !== "pro" && setAppMode("pro")}
            className={cn(
              "flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              appMode === "pro"
                ? "border-primary bg-primary/5"
                : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2">
              <Crown className={cn("h-4 w-4", appMode === "pro" ? "text-primary" : "text-muted-foreground")} />
              <span className="font-semibold text-sm tracking-tight">Pro</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Prosjekter, kjøring, materialer
            </p>
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <MenuItem
          icon={<BarChart3 className="h-5 w-5" />}
          label="Min oversikt"
          description="Timer, lønn og overtid for uken og måneden"
          onClick={() => navigate("/overview")}
        />

        <div className="border-t border-border/50 my-2" />

        <MenuItem
          icon={<User className="h-5 w-5" />}
          label="Profil"
          description="Navn, e-post og organisasjon"
          onClick={() => navigate("/more/profile")}
        />

      <MenuItem
        icon={<Briefcase className="h-5 w-5" />}
        label="Arbeid & Lønn"
        description="Timelønn, arbeidstid og standarddag"
        onClick={() => navigate("/more/work")}
      />

      <MenuItem
        icon={<Palette className="h-5 w-5" />}
        label="Utseende"
        description="Tema, modus og visningsvalg"
        onClick={() => navigate("/more/appearance")}
      />

      <MenuItem
        icon={<Bell className="h-5 w-5" />}
        label="Varsler"
        description="Værvarsel og notifikasjoner"
        onClick={() => navigate("/more/notifications")}
      />

      {isAdmin && (
        <>
          <div className="border-t border-border/50 my-2" />

          <MenuItem
            icon={<Shield className="h-5 w-5" />}
            label="Admin"
            description="Administrer brukere og roller"
            onClick={() => navigate("/admin")}
          />
        </>
      )}

      <div className="border-t border-border/50 my-2" />

      <MenuItem
        icon={<LogOut className="h-5 w-5" />}
        label="Logg ut"
        onClick={signOut}
        destructive
      />
      </div>
    </div>
  );
}
