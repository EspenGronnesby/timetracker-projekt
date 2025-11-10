import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Car, Package, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface CustomerProject {
  id: string;
  name: string;
  customer_name: string;
  customer_email: string;
  created_at: string;
  description: string;
  total_duration_seconds: number;
  time_entry_count: number;
  total_kilometers: number;
  drive_entry_count: number;
  material_count: number;
  total_material_cost: number;
}

interface CustomerSession {
  email: string;
  name: string;
  loginTime: string;
}

export default function CustomerProjects() {
  const [projects, setProjects] = useState<CustomerProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const sessionData = localStorage.getItem("customer_session");
    if (!sessionData) {
      navigate("/kunde-innlogging");
      return;
    }

    const session = JSON.parse(sessionData);
    setCustomerSession(session);
    fetchProjects(session.email);
  }, [navigate]);

  const fetchProjects = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-get-projects", {
        body: { email },
      });

      if (error) throw error;

      setProjects(data.projects || []);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast.error("Kunne ikke hente prosjekter");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("customer_session");
    toast.success("Du er nå logget ut");
    navigate("/kunde-innlogging");
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}t ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-primary to-accent p-6 text-primary-foreground">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dine prosjekter</h1>
            <p className="text-sm opacity-90">{customerSession?.name}</p>
          </div>
          <Button variant="secondary" onClick={handleLogout} size="lg">
            <LogOut className="mr-2 h-4 w-4" />
            Logg ut
          </Button>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">
              Ingen fullførte prosjekter ennå
            </h2>
            <p className="text-muted-foreground">
              Vi holder deg oppdatert når vi fullfører prosjekter for deg!
            </p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-6">
              Viser {projects.length} fullførte prosjekt{projects.length !== 1 ? "er" : ""}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                      <Badge className="bg-green-500 hover:bg-green-600 shrink-0">
                        ✓ Fullført
                      </Badge>
                    </div>
                    <CardDescription>
                      {format(new Date(project.created_at), "dd.MM.yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {formatDuration(project.total_duration_seconds)}
                        </span>
                        <span className="text-muted-foreground">
                          ({project.time_entry_count} registreringer)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Car className="h-4 w-4 text-accent" />
                        <span className="font-medium">
                          {project.total_kilometers.toFixed(1)} km
                        </span>
                        <span className="text-muted-foreground">
                          ({project.drive_entry_count} kjøringer)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-accent-tertiary" />
                        <span className="font-medium">
                          {project.material_count} materialer
                        </span>
                      </div>
                    </div>

                    {project.description && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="bg-muted py-6 mt-12">
        <div className="container mx-auto text-center text-sm text-muted-foreground px-4">
          <p>© 2025 HandyHjelp - Lojalitetsprogram</p>
          <p className="mt-2">
            Spørsmål? Kontakt oss på <a href="mailto:info@handyhjelp.no" className="underline hover:text-foreground">info@handyhjelp.no</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
