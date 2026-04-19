import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function JoinProject() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=/join/${inviteCode}`);
    }
  }, [user, authLoading, navigate, inviteCode]);

  const handleJoinProject = async () => {
    if (!user || !inviteCode) return;

    setJoining(true);
    setError(null);

    try {
      // Ikke idempotent (oppretter medlemskap) — derfor ingen retry.
      // Men edge function kan fortsatt returnere i ulike former, så vi
      // håndterer alle nå:
      //   - error fra invoke (nettverksfeil eller non-2xx)
      //   - data.error fra edge function (validering)
      //   - manglende data.projectName (uventet shape)
      const { data, error } = await supabase.functions.invoke('join-project-via-invite', {
        body: { inviteCode },
      });

      if (error) {
        throw new Error(error.message || 'Kunne ikke kontakte serveren. Prøv igjen.');
      }

      if (!data) {
        throw new Error('Serveren svarte uten data. Prøv igjen.');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.projectName) {
        throw new Error('Ugyldig invitasjonskode eller allerede brukt.');
      }

      setProjectName(data.projectName);
      setJoined(true);

      toast({
        title: "Velkommen!",
        description: `Du er nå medlem av ${data.projectName}`,
      });

      // Redirect til dashboard etter 2 sek
      setTimeout(() => {
        navigate('/app');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kunne ikke bli medlem av prosjektet';
      console.error('Error joining project:', err);
      setError(msg);
      toast({
        variant: "destructive",
        title: "Feil",
        description: msg,
      });
    } finally {
      setJoining(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
      <Card className="w-full max-w-md p-8 rounded-2xl">
        {!joined && !error && (
          <>
            <h1 className="text-2xl font-bold mb-4 text-center tracking-tight">Slå seg sammen med prosjekt</h1>
            <p className="text-muted-foreground text-center mb-6 leading-snug">
              Du har blitt invitert til å bli med i et prosjekt. Klikk nedenfor for å godta invitasjonen.
            </p>
            <Button
              onClick={handleJoinProject}
              disabled={joining}
              className="w-full h-11 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              size="lg"
            >
              {joining ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Blir medlem...
                </>
              ) : (
                'Bli medlem av prosjekt'
              )}
            </Button>
          </>
        )}

        {joined && (
          <div className="text-center animate-fade-in">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 tracking-tight">Velkommen!</h2>
            <p className="text-muted-foreground leading-snug">
              Du har blitt medlem av {projectName}. Omdirigerer...
            </p>
          </div>
        )}

        {error && (
          <div className="text-center animate-fade-in">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 tracking-tight">Kunne ikke bli medlem</h2>
            <p className="text-muted-foreground mb-4 leading-snug">{error}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={() => {
                  setError(null);
                  handleJoinProject();
                }}
                disabled={joining}
                className="h-10 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Prøv igjen
              </Button>
              <Button
                onClick={() => navigate('/app')}
                variant="outline"
                className="h-10 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Gå til dashboard
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}