import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Cloud, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";

const Notifications = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const [showWeatherWidget, setShowWeatherWidget] = useState(false);
  const [showWeatherNotifications, setShowWeatherNotifications] = useState(true);

  useEffect(() => {
    if (profile) {
      setShowWeatherWidget(profile.show_weather_widget || false);
      setShowWeatherNotifications(profile.show_weather_notifications !== false);
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
        <h2 className="text-2xl font-bold tracking-tight">Varsler</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-snug">
          Administrer notifikasjoner og varsler
        </p>
      </div>

      {/* Værvarsel */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Værvarsel</h3>
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
              onCheckedChange={(v) => toggleSetting("show_weather_widget", setShowWeatherWidget, v)}
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
              onCheckedChange={(v) => toggleSetting("show_weather_notifications", setShowWeatherNotifications, v)}
            />
          </div>
        </div>
      </Card>

      {/* Info card */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium tracking-tight">Push-notifikasjoner</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">
              Push-notifikasjoner aktiveres automatisk når du gir appen tillatelse i nettleseren din. Du kan administrere disse innstillingene direkte i nettleserens innstillinger.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Notifications;
