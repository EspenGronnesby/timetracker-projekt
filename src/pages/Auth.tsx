import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Search, Building2, Loader2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const authSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(6, "Passord må være minst 6 tegn"),
  name: z.string().min(2, "Navn må være minst 2 tegn").optional(),
  organizationNumber: z.string().min(9, "Organisasjonsnummer må være minst 9 tegn").optional(),
  organizationName: z.string().min(2, "Firmanavn må være minst 2 tegn").optional(),
});

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [organizationNumber, setOrganizationNumber] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const searchOrganization = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-organization', {
        body: { query }
      });

      if (error) throw error;

      setSearchResults(data.organizations || []);
    } catch (error) {
      console.error('Error searching organizations:', error);
      toast({
        variant: "destructive",
        title: "Søkefeil",
        description: "Kunne ikke søke i Brønnøysundregistrene",
      });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectOrganization = (org: any) => {
    setOrganizationNumber(org.organizationNumber);
    setOrganizationName(org.name);
    setOpen(false);
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationData = isLogin
        ? { email, password }
        : { email, password, name, organizationNumber, organizationName };
      
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              name,
              organization_number: organizationNumber,
              organization_name: organizationName
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        // Update profile with organization info
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              organization_number: organizationNumber,
              organization_name: organizationName
            })
            .eq('id', data.user.id);

          if (profileError) {
            console.error('Error updating profile:', profileError);
          }
        }

        toast({
          title: "Konto opprettet!",
          description: "Du er nå logget inn og kan begynne å bruke appen.",
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? "Logg inn" : "Registrer deg"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Logg inn med din e-post og passord"
              : "Opprett en ny konto for å komme i gang"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Navn</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ditt navn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Søk etter firma</Label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                      >
                        {organizationName || "Søk i Brønnøysundregistrene..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Søk etter firmanavn..."
                          value={searchQuery}
                          onValueChange={(value) => {
                            setSearchQuery(value);
                            searchOrganization(value);
                          }}
                        />
                        <CommandList>
                          {searching && (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                            <CommandEmpty>Ingen firma funnet</CommandEmpty>
                          )}
                          {!searching && searchResults.length > 0 && (
                            <CommandGroup>
                              {searchResults.map((org) => (
                                <CommandItem
                                  key={org.organizationNumber}
                                  onSelect={() => selectOrganization(org)}
                                  className="cursor-pointer"
                                >
                                  <Building2 className="mr-2 h-4 w-4" />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{org.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      Org.nr: {org.organizationNumber} • {org.type}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {organizationName && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Valgt firma: <strong>{organizationName}</strong></p>
                      <p>Org.nr: <strong>{organizationNumber}</strong></p>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@epost.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passord</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Laster..." : isLogin ? "Logg inn" : "Registrer deg"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin
                ? "Har du ikke konto? Registrer deg"
                : "Har du allerede konto? Logg inn"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
