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
      const { data, error } = await supabase.functions.invoke('join-project-via-invite', {
        body: { inviteCode },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setProjectName(data.projectName || 'the project');
      setJoined(true);
      
      toast({
        title: "Success!",
        description: `You've joined ${data.projectName}`,
      });

      // Redirect to home after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      console.error('Error joining project:', err);
      setError(err.message || 'Failed to join project');
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || 'Failed to join project',
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        {!joined && !error && (
          <>
            <h1 className="text-2xl font-bold mb-4 text-center">Join Project</h1>
            <p className="text-muted-foreground text-center mb-6">
              You've been invited to join a project. Click below to accept the invitation.
            </p>
            <Button
              onClick={handleJoinProject}
              disabled={joining}
              className="w-full"
              size="lg"
            >
              {joining ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Project'
              )}
            </Button>
          </>
        )}

        {joined && (
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Welcome!</h2>
            <p className="text-muted-foreground">
              You've successfully joined {projectName}. Redirecting...
            </p>
          </div>
        )}

        {error && (
          <div className="text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go Home
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}