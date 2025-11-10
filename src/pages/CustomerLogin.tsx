import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CustomerLogin() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Vennligst skriv inn en gyldig e-postadresse");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("customer-login", {
        body: { email: email.toLowerCase() },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Store customer session in localStorage
      localStorage.setItem("customer_session", JSON.stringify({
        email: data.customer.email,
        name: data.customer.name,
        loginTime: new Date().toISOString(),
      }));

      toast.success(`Velkommen, ${data.customer.name}!`);
      navigate("/kunde-portal");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Kunne ikke logge inn. Prøv igjen senere.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Kundeportal</CardTitle>
          <CardDescription className="text-base">
            HandyHjelp - Se dine fullførte prosjekter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-postadresse</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@epost.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logger inn...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Logg inn
                </>
              )}
            </Button>
          </form>

          <Alert className="mt-6">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Skriv inn e-postadressen som er registrert på prosjektene dine.
              Du får kun tilgang hvis du har fullførte prosjekter hos oss.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
