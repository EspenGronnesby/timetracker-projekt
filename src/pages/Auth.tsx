import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Hammer } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(6, "Passord må være minst 6 tegn"),
  name: z.string().min(2, "Navn må være minst 2 tegn").optional(),
});

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/app");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/app");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationData = isLogin
        ? { email, password }
        : { email, password, name };

      authSchema.parse(validationData);

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Velkommen tilbake!",
          description: "Du er nå logget inn.",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Konto opprettet!",
          description: "Din personlige arbeidsområde er klar!",
        });
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Valideringsfeil",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: isLogin ? "Innlogging feilet" : "Registrering feilet",
          description: error.message || "Noe gikk galt. Prøv igjen.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validateEmail = z.string().email("Ugyldig e-postadresse").parse(email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Epost sendt!",
        description: "Sjekk e-posten din for nullstillingslenke",
      });

      setEmail("");
      setShowForgotPassword(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Valideringsfeil",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Passordnullstilling feilet",
          description: error.message || "Noe gikk galt. Prøv igjen.",
        });
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="animate-fade-in min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm border-border/50 shadow-lg rounded-xl">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hammer className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight">TimeTracker</span>
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">{isLogin ? "Velkommen tilbake" : "Opprett konto"}</CardTitle>
            <CardDescription className="mt-1.5">
              {isLogin
                ? "Logg inn for å fortsette"
                : "Kom i gang på under ett minutt"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="forgot-email" className="font-medium">E-post</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="din@epost.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl font-medium transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background" disabled={loading}>
                {loading ? "Laster..." : "Send nullstillingslenke"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setEmail("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 underline-offset-4 hover:underline"
              >
                ← Tilbake til login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-3">
                  <Label htmlFor="name" className="font-medium">Navn</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ditt navn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>
              )}
              <div className="space-y-3">
                <Label htmlFor="email" className="font-medium">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="din@epost.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="password" className="font-medium">Passord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setPassword("");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Glemt passord?
                  </button>
                )}
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl font-medium transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background" disabled={loading}>
                {loading ? "Laster..." : isLogin ? "Logg inn" : "Registrer deg"}
              </Button>
            </form>
          )}

          {!showForgotPassword && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 underline-offset-4 hover:underline"
              >
                {isLogin
                  ? "Har du ikke konto? Registrer deg"
                  : "Har du allerede konto? Logg inn"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
