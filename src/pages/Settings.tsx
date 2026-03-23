import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Palette, Cloud, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useColorTheme, ColorTheme } from "@/hooks/useColorTheme";
import { ColorWheel } from "@/components/ColorWheel";
import { Sparkles } from "lucide-react";
import { useAppMode } from "@/hooks/useAppMode";
import { cn } from "@/lib/utils";

const themes: { value: ColorTheme; label: string; description: string; preview: string }[] = [
  { 
    value: 'light', 
    label: 'Lys', 
    description: 'Standard lyst tema',
    preview: 'bg-background border-2 border-border' 
  },
  { 
    value: 'dark', 
    label: 'Mørk', 
    description: 'Standard mørkt tema',
    preview: 'bg-[hsl(180,15%,8%)] border-2 border-[hsl(180,10%,20%)]' 
  },
  { 
    value: 'high-contrast-dark', 
    label: 'Høy kontrast', 
    description: 'Optimalisert for bruk i sollys',
    preview: 'bg-[hsl(180,25%,4%)] border-2 border-[hsl(178,75%,55%)]' 
  },
  { 
    value: 'ocean', 
    label: 'Ocean blå', 
    description: 'Blå-basert fargetema',
    preview: 'bg-[hsl(220,35%,12%)] border-2 border-[hsl(195,85%,55%)]' 
  },
  { 
    value: 'forest', 
    label: 'Skog grønn', 
    description: 'Grønn-basert fargetema',
    preview: 'bg-[hsl(150,30%,10%)] border-2 border-[hsl(142,76%,50%)]' 
  },
  { 
    value: 'sunset', 
    label: 'Solnedgang lilla', 
    description: 'Lilla-basert fargetema',
    preview: 'bg-[hsl(280,25%,10%)] border-2 border-[hsl(280,65%,60%)]' 
  },
];

const Settings = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const { currentTheme, setColorTheme } = useColorTheme();
  
  const [showTeamInvite, setShowTeamInvite] = useState(false);
  const [showProjectActions, setShowProjectActions] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showCostCalculator, setShowCostCalculator] = useState(false);
  const [showWeatherWidget, setShowWeatherWidget] = useState(false);
  const [showWeatherNotifications, setShowWeatherNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showAllThemes, setShowAllThemes] = useState(false);

  useEffect(() => {
    if (profile) {
      setShowTeamInvite(profile.show_team_invite || false);
      setShowProjectActions(profile.show_project_actions || false);
      setShowActivityLog(profile.show_activity_log || false);
      setShowCostCalculator(profile.show_cost_calculator || false);
      setShowWeatherWidget(profile.show_weather_widget || false);
      setShowWeatherNotifications(profile.show_weather_notifications !== false);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          show_team_invite: showTeamInvite,
          show_project_actions: showProjectActions,
          show_activity_log: showActivityLog,
          show_cost_calculator: showCostCalculator,
          show_weather_widget: showWeatherWidget,
          show_weather_notifications: showWeatherNotifications,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Innstillinger lagret",
        description: "Dine preferanser er oppdatert",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke lagre innstillinger",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Laster...</p>
      </div>
    );
  }

  const { appMode, setAppMode } = useAppMode();

  return (
    <div className="py-6 px-4 sm:px-6 max-w-2xl mx-auto space-y-6">
        {/* App Mode Toggle */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">App-modus</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Velg mellom enkel tidsregistrering eller full prosjektstyring
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAppMode("simple")}
              className={cn(
                "p-4 rounded-lg border-2 text-left transition-all",
                appMode === "simple"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="font-medium mb-1">Enkel</div>
              <p className="text-xs text-muted-foreground">
                Start/stopp timer, pauser, lønnsberegning
              </p>
            </button>
            <button
              onClick={() => setAppMode("pro")}
              className={cn(
                "p-4 rounded-lg border-2 text-left transition-all",
                appMode === "pro"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="font-medium mb-1">Pro</div>
              <p className="text-xs text-muted-foreground">
                Prosjekter, kjøring, materialer, team
              </p>
            </button>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Fargetema</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Spin hjulet for tilfeldig tema, eller velg selv fra listen under.
          </p>

          <ColorWheel 
            onThemeSelect={(theme) => {
              setColorTheme(theme);
              setIsSpinning(false);
            }}
            currentTheme={currentTheme}
            isSpinning={isSpinning}
          />

          <div className="flex gap-3 mt-6 justify-center">
            <Button
              onClick={() => setIsSpinning(true)}
              disabled={isSpinning}
              className="flex items-center gap-2"
              variant="default"
            >
              <Sparkles className="h-4 w-4" />
              {isSpinning ? "Spinner..." : "Feeling Lucky"}
            </Button>
            
            <Button
              onClick={() => setShowAllThemes(!showAllThemes)}
              variant="outline"
            >
              {showAllThemes ? "Skjul farger" : "Vis flere farger"}
            </Button>
          </div>

          {showAllThemes && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 animate-fade-in">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => setColorTheme(theme.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left hover:scale-105 ${
                    currentTheme === theme.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded ${theme.preview}`} />
                    <span className="font-medium">{theme.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{theme.description}</p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cloud className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Værvarsel</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Få værvarsel og notifikasjoner om dårlig vær dagen før
          </p>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="weather-widget" className="text-base">
                  Vis værvarsel widget
                </Label>
                <p className="text-sm text-muted-foreground">
                  Vis værvarsel på hovedsiden med dagens og morgendagens vær
                </p>
              </div>
              <Switch
                id="weather-widget"
                checked={showWeatherWidget}
                onCheckedChange={setShowWeatherWidget}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="weather-notifications" className="text-base">
                  Få notifikasjoner om dårlig vær
                </Label>
                <p className="text-sm text-muted-foreground">
                  Motta varsel dagen før om regn, snø eller storm
                </p>
              </div>
              <Switch
                id="weather-notifications"
                checked={showWeatherNotifications}
                onCheckedChange={setShowWeatherNotifications}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Prosjektdetaljer visning</h2>
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
                onCheckedChange={setShowTeamInvite}
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
                onCheckedChange={setShowProjectActions}
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
                onCheckedChange={setShowActivityLog}
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
                onCheckedChange={setShowCostCalculator}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? "Lagrer..." : "Lagre"}
            </Button>
          </div>
        </Card>
    </div>
  );
};

export default Settings;
