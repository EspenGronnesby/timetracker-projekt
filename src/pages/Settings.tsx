import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  
  const [showTeamInvite, setShowTeamInvite] = useState(false);
  const [showProjectActions, setShowProjectActions] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setShowTeamInvite(profile.show_team_invite || false);
      setShowProjectActions(profile.show_project_actions || false);
      setShowActivityLog(profile.show_activity_log || false);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Laster...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-card via-primary/5 to-card border-b border-border py-3 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Innstillinger
          </h1>
        </div>
      </header>

      <main className="py-8 px-4 max-w-2xl mx-auto">
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
      </main>
    </div>
  );
};

export default Settings;
