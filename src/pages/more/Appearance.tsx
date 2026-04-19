import { useAuth, AppMode } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Palette, Zap, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { useColorTheme, ColorTheme } from "@/hooks/useColorTheme";

const themes: { value: ColorTheme; label: string; description: string; preview: string }[] = [
  { value: 'light', label: 'Lys', description: 'Standard lyst tema', preview: 'bg-background border-2 border-border' },
  { value: 'dark', label: 'Mørk', description: 'Standard mørkt tema', preview: 'bg-[hsl(180,15%,8%)] border-2 border-[hsl(180,10%,20%)]' },
  { value: 'high-contrast-dark', label: 'Høy kontrast', description: 'Optimalisert for bruk i sollys', preview: 'bg-[hsl(180,25%,4%)] border-2 border-[hsl(178,75%,55%)]' },
  { value: 'ocean', label: 'Ocean blå', description: 'Blå-basert fargetema', preview: 'bg-[hsl(220,35%,12%)] border-2 border-[hsl(195,85%,55%)]' },
  { value: 'forest', label: 'Skog grønn', description: 'Grønn-basert fargetema', preview: 'bg-[hsl(150,30%,10%)] border-2 border-[hsl(142,76%,50%)]' },
  { value: 'sunset', label: 'Solnedgang lilla', description: 'Lilla-basert fargetema', preview: 'bg-[hsl(280,25%,10%)] border-2 border-[hsl(280,65%,60%)]' },
];

const Appearance = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const { currentTheme, setColorTheme } = useColorTheme();

  const [appMode, setAppMode] = useState<AppMode>("pro");
  const [showTeamInvite, setShowTeamInvite] = useState(false);
  const [showProjectActions, setShowProjectActions] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showCostCalculator, setShowCostCalculator] = useState(false);
  const [showDrivingCard, setShowDrivingCard] = useState(true);

  useEffect(() => {
    if (profile) {
      setAppMode((profile.app_mode as AppMode) || "pro");
      setShowTeamInvite(profile.show_team_invite || false);
      setShowProjectActions(profile.show_project_actions || false);
      setShowActivityLog(profile.show_activity_log || false);
      setShowCostCalculator(profile.show_cost_calculator || false);
      setShowDrivingCard(profile.show_driving_card !== false);
    }
  }, [profile]);

  const saveSetting = useCallback(async (field: string, value: unknown) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Kunne ikke lagre", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  const toggleSetting = (
    field: string,
    setter: (v: boolean) => void,
    newValue: boolean
  ) => {
    setter(newValue);
    saveSetting(field, newValue);
  };

  const changeAppMode = (mode: AppMode) => {
    setAppMode(mode);
    saveSetting("app_mode", mode);
    toast({ title: mode === "light" ? "Light-modus aktivert" : "Pro-modus aktivert" });
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Laster...</p>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Utseende</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-snug">
          Tema, modus og visningspreferanser
        </p>
      </div>

      {/* App-modus velger */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">App-modus</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Velg visningen som passer best for deg
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => changeAppMode("light")}
            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
              appMode === "light"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/60 hover:border-primary/40 hover:bg-muted/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className={`h-5 w-5 ${appMode === "light" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-semibold tracking-tight">Light</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enkel stoppeklokke. Start, stopp, pause. Perfekt for ansatte.
            </p>
          </button>

          <button
            onClick={() => changeAppMode("pro")}
            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
              appMode === "pro"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/60 hover:border-primary/40 hover:bg-muted/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Crown className={`h-5 w-5 ${appMode === "pro" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-semibold tracking-tight">Pro</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Full oversikt. Prosjektstyring, rapporter, team. For ledere.
            </p>
          </button>
        </div>
      </Card>

      {/* Fargetema */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Fargetema</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Velg fargen som passer deg best.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themes.map((theme) => {
            const isSelected = currentTheme === theme.value;
            return (
              <button
                key={theme.value}
                onClick={() => setColorTheme(theme.value)}
                className={`group relative p-3 rounded-xl border-2 transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <div className={`w-full h-10 rounded-lg mb-2 ${theme.preview}`} />
                <p className="text-sm font-medium tracking-tight">{theme.label}</p>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Prosjektdetaljer visning */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold tracking-tight mb-4">Prosjektdetaljer visning</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Velg hvilke seksjoner som skal vises på prosjektdetaljer siden
        </p>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="team-invite" className="text-base">
                Team invite
              </Label>
              <p className="text-sm text-muted-foreground">
                Vis team invite-seksjonen for å invitere medlemmer
              </p>
            </div>
            <Switch
              id="team-invite"
              checked={showTeamInvite}
              onCheckedChange={(v) => toggleSetting("show_team_invite", setShowTeamInvite, v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="project-actions" className="text-base">
                Prosjekthandlinger
              </Label>
              <p className="text-sm text-muted-foreground">
                Vis prosjekthandlinger som rapportgenerering og forlat prosjekt
              </p>
            </div>
            <Switch
              id="project-actions"
              checked={showProjectActions}
              onCheckedChange={(v) => toggleSetting("show_project_actions", setShowProjectActions, v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="activity-log" className="text-base">
                Aktivitetslogg
              </Label>
              <p className="text-sm text-muted-foreground">
                Vis aktivitetsloggen med tidsregistreringer og materialer
              </p>
            </div>
            <Switch
              id="activity-log"
              checked={showActivityLog}
              onCheckedChange={(v) => toggleSetting("show_activity_log", setShowActivityLog, v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="cost-calculator" className="text-base">
                Kostnadskalkulator
              </Label>
              <p className="text-sm text-muted-foreground">
                Vis kostnadskalkulator for å beregne prosjektkostnader
              </p>
            </div>
            <Switch
              id="cost-calculator"
              checked={showCostCalculator}
              onCheckedChange={(v) => toggleSetting("show_cost_calculator", setShowCostCalculator, v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="driving-card" className="text-base">
                Kjøring på Min oversikt
              </Label>
              <p className="text-sm text-muted-foreground">
                Vis kilometer og kjøreturer som eget kort på oversikten
              </p>
            </div>
            <Switch
              id="driving-card"
              checked={showDrivingCard}
              onCheckedChange={(v) => toggleSetting("show_driving_card", setShowDrivingCard, v)}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Appearance;
