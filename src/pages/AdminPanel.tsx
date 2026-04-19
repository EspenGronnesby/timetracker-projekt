import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithRetry } from "@/lib/invokeWithRetry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserCog } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  name: string;
  organization_number: string;
  organization_name: string;
}

interface UserWithRole {
  profile: Profile;
  role: 'admin' | 'user' | null;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (isAdmin === false) {
      toast({
        variant: "destructive",
        title: "Ingen tilgang",
        description: "Kun administratorer kan se denne siden",
      });
      navigate("/app");
    }
  }, [isAdmin, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Call server-side admin verification endpoint (enforces admin check server-side)
      const { data, error } = await invokeWithRetry<{ users: Array<{ [k: string]: unknown }> }>(
        'admin-get-users',
        {},
        { idempotent: true }
      );
      
      if (error) {
        console.error('Error fetching users:', error);
        throw new Error(error.message || 'Failed to fetch users');
      }

      if (data?.users) {
        // Transform to match existing UserWithRole structure
        const usersWithRoles: UserWithRole[] = data.users.map((user: any) => ({
          profile: {
            id: user.id,
            name: user.name,
            organization_number: user.organization_number,
            organization_name: user.organization_name,
          },
          role: user.role as 'admin' | 'user' | null
        }));
        
        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke hente brukere",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const grantAdminRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'admin'
        });

      if (error) throw error;

      toast({
        title: "Suksess",
        description: "Admin-rolle tildelt",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error granting admin role:', error);
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke tildele admin-rolle",
      });
    }
  };

  const revokeAdminRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Suksess",
        description: "Admin-rolle fjernet",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error revoking admin role:', error);
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke fjerne admin-rolle",
      });
    }
  };

  if (loading || isAdmin === null || loadingUsers) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Laster...</p>
      </div>
    );
  }

  if (!user || isAdmin === false) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">
            <UserCog className="h-4 w-4 mr-2" />
            Brukerhåndtering
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="tracking-tight">Brukere i organisasjonen</CardTitle>
              <CardDescription className="leading-snug">
                Administrer brukerroller og tilganger
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map(({ profile, role }) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-4 border rounded-xl transition-colors duration-150 hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium leading-snug">{profile.name}</p>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {role === 'admin' ? (
                          <span className="text-primary font-semibold">Admin</span>
                        ) : (
                          <span>Bruker</span>
                        )}
                      </p>
                    </div>
                    <div>
                      {role === 'admin' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeAdminRole(profile.id)}
                          disabled={profile.id === user.id}
                          className="h-10 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          Fjern admin
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => grantAdminRole(profile.id)}
                          className="h-10 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          Gjør til admin
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
