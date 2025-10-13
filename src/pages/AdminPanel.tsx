import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, UserCog } from "lucide-react";
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
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (isAdmin === false) {
      toast({
        variant: "destructive",
        title: "Ingen tilgang",
        description: "Kun administratorer kan se denne siden",
      });
      navigate("/");
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
      const { data, error } = await supabase.functions.invoke('admin-get-users');
      
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

  if (loading || loadingUsers) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Laster...</p>
      </div>
    );
  }

  if (!user || isAdmin === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Admin Panel
            </h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">
              <UserCog className="h-4 w-4 mr-2" />
              Brukerhåndtering
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Brukere i organisasjonen</CardTitle>
                <CardDescription>
                  Administrer brukerroller og tilganger
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map(({ profile, role }) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{profile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {role === 'admin' ? (
                            <span className="text-orange-600 font-semibold">Admin</span>
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
                          >
                            Fjern admin
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => grantAdminRole(profile.id)}
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
    </div>
  );
}
