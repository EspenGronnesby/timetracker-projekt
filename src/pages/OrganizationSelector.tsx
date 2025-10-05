import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';

interface SearchResult {
  id: string;
  organization_number: string;
  organization_name: string;
}

const OrganizationSelectorContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizations, selectOrganization, loading, refreshOrganizations } = useOrganization();
  const { toast } = useToast();
  const [showNewOrgForm, setShowNewOrgForm] = useState(false);
  const [searchType, setSearchType] = useState<'number' | 'name'>('number');
  const [orgNumber, setOrgNumber] = useState('');
  const [orgName, setOrgName] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showNameField, setShowNameField] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSelectOrganization = (org: any) => {
    selectOrganization(org);
    navigate('/');
  };

  const handleSearchByNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgNumber.trim()) {
      toast({
        title: 'Mangler informasjon',
        description: 'Vennligst oppgi organisasjonsnummer',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      const validated = z.string().trim().min(1).max(20).parse(orgNumber);

      // Search Brønnøysundregisteret first
      console.log('Searching Brønnøysundregisteret for org number:', validated);
      const { data: brregData, error: brregError } = await supabase.functions.invoke('search-brreg', {
        body: { query: validated, type: 'number' }
      });

      if (brregError) throw brregError;

      if (brregData?.results && brregData.results.length > 0) {
        const brregOrg = brregData.results[0];
        console.log('Found in Brønnøysundregisteret:', brregOrg);
        
        // Check if organization exists in our database
        const { data: existingOrg, error: searchError } = await supabase
          .from('organizations')
          .select('id, organization_number, organization_name')
          .eq('organization_number', validated)
          .maybeSingle();

        if (searchError) throw searchError;

        if (existingOrg) {
          // Organization exists in our DB - join it
          const { error: joinError } = await supabase
            .from('user_organizations')
            .insert({
              user_id: user!.id,
              organization_id: existingOrg.id,
            });

          if (joinError) {
            if (joinError.code === '23505') {
              toast({
                title: 'Allerede medlem',
                description: 'Du er allerede medlem av denne organisasjonen',
                variant: 'destructive',
              });
              return;
            }
            throw joinError;
          }

          toast({
            title: 'Velkommen!',
            description: `Du har blitt lagt til i ${existingOrg.organization_name}`,
          });

          await refreshOrganizations();
          selectOrganization(existingOrg);
          navigate('/');
        } else {
          // Organization not in our DB - create it with Brreg data
          const { data: newOrg, error: createError } = await supabase
            .from('organizations')
            .insert({
              organization_number: brregOrg.organisasjonsnummer,
              organization_name: brregOrg.navn,
              created_by: user!.id,
            })
            .select()
            .single();

          if (createError) throw createError;

          // Add user to organization
          const { error: joinError } = await supabase
            .from('user_organizations')
            .insert({
              user_id: user!.id,
              organization_id: newOrg.id,
            });

          if (joinError) throw joinError;

          toast({
            title: 'Organisasjon opprettet!',
            description: `${brregOrg.navn} er nå opprettet`,
          });

          await refreshOrganizations();
          selectOrganization(newOrg);
          navigate('/');
        }
      } else {
        // Not found in Brønnøysundregisteret
        toast({
          title: 'Ikke funnet',
          description: 'Fant ikke organisasjonen i Brønnøysundregisteret. Sjekk organisasjonsnummeret.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching organization:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke søke etter organisasjon',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSearchByName = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast({
        title: 'Mangler informasjon',
        description: 'Vennligst oppgi firmanavn',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      const searchTerm = orgName.trim();
      
      // Search Brønnøysundregisteret
      console.log('Searching Brønnøysundregisteret for name:', searchTerm);
      const { data: brregData, error: brregError } = await supabase.functions.invoke('search-brreg', {
        body: { query: searchTerm, type: 'name' }
      });

      if (brregError) throw brregError;

      if (brregData?.results && brregData.results.length > 0) {
        console.log(`Found ${brregData.results.length} organizations in Brønnøysundregisteret`);
        setSearchResults(brregData.results.map((org: any) => ({
          id: org.organisasjonsnummer, // Use org number as temporary ID
          organization_number: org.organisasjonsnummer,
          organization_name: org.navn,
          organisasjonsform: org.organisasjonsform,
          adresse: org.adresse,
        })));
      } else {
        toast({
          title: 'Ingen treff',
          description: 'Fant ingen organisasjoner med det navnet i Brønnøysundregisteret',
        });
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching organization:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke søke etter organisasjon',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinOrganization = async (org: any) => {
    setCreating(true);
    try {
      // Check if organization exists in our database
      const { data: existingOrg, error: findError } = await supabase
        .from('organizations')
        .select('id, organization_number, organization_name')
        .eq('organization_number', org.organization_number)
        .maybeSingle();

      if (findError) throw findError;

      let orgToJoin = existingOrg;

      if (!existingOrg) {
        // Create organization in our database
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert({
            organization_number: org.organization_number,
            organization_name: org.organization_name,
            created_by: user!.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        orgToJoin = newOrg;
      }

      // Add user to organization
      const { error: joinError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user!.id,
          organization_id: orgToJoin.id,
        });

      if (joinError) {
        if (joinError.code === '23505') {
          toast({
            title: 'Allerede medlem',
            description: 'Du er allerede medlem av denne organisasjonen',
            variant: 'destructive',
          });
          return;
        }
        throw joinError;
      }

      toast({
        title: 'Velkommen!',
        description: `Du har blitt lagt til i ${orgToJoin.organization_name}`,
      });

      await refreshOrganizations();
      selectOrganization(orgToJoin);
      navigate('/');
    } catch (error) {
      console.error('Error joining organization:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke bli med i organisasjon',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const validated = z.object({
        organization_number: z.string().trim().min(1).max(20),
        organization_name: z.string().trim().min(1, 'Firmanavn er påkrevd').max(100),
      }).parse({
        organization_number: orgNumber,
        organization_name: orgName,
      });

      // Create new organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          organization_number: validated.organization_number,
          organization_name: validated.organization_name,
          created_by: user!.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user to organization
      const { error: joinError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user!.id,
          organization_id: newOrg.id,
        });

      if (joinError) throw joinError;

      toast({
        title: 'Organisasjon opprettet!',
        description: `${validated.organization_name} er nå opprettet`,
      });

      await refreshOrganizations();
      selectOrganization(newOrg);
      navigate('/');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Valideringsfeil',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        console.error('Error creating organization:', error);
        toast({
          title: 'Feil',
          description: 'Kunne ikke opprette organisasjon',
          variant: 'destructive',
        });
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Laster...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Building2 className="h-6 w-6" />
            Velg organisasjon
          </CardTitle>
          <CardDescription>
            Velg hvilken organisasjon du vil jobbe med, eller bli med i en ny
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {organizations.length > 0 && !showNewOrgForm && (
            <div className="space-y-2">
              <Label>Dine organisasjoner</Label>
              {organizations.map((org) => (
                <Button
                  key={org.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => handleSelectOrganization(org)}
                >
                  <div className="text-left">
                    <div className="font-semibold">{org.organization_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Org.nr: {org.organization_number}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}

          {!showNewOrgForm ? (
            <Button
              variant="default"
              className="w-full"
              onClick={() => setShowNewOrgForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {organizations.length === 0 ? 'Bli med i organisasjon' : 'Legg til organisasjon'}
            </Button>
          ) : (
            <Tabs value={searchType} onValueChange={(v) => setSearchType(v as 'number' | 'name')} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="number">Org.nummer</TabsTrigger>
                <TabsTrigger value="name">Firmanavn</TabsTrigger>
              </TabsList>

              <TabsContent value="number" className="space-y-4">
                <form onSubmit={showNameField ? handleCreateOrganization : handleSearchByNumber} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-number">Organisasjonsnummer *</Label>
                    <Input
                      id="org-number"
                      placeholder="123456789"
                      value={orgNumber}
                      onChange={(e) => setOrgNumber(e.target.value)}
                      disabled={showNameField}
                      required
                    />
                    {!showNameField && (
                      <p className="text-xs text-muted-foreground">
                        Søker i Brønnøysundregisteret
                      </p>
                    )}
                  </div>

                  {showNameField && (
                    <div className="space-y-2">
                      <Label htmlFor="org-name-create">Firmanavn *</Label>
                      <Input
                        id="org-name-create"
                        placeholder="Mitt Firma AS"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Organisasjonen finnes ikke og vil bli opprettet
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowNewOrgForm(false);
                        setShowNameField(false);
                        setOrgNumber('');
                        setOrgName('');
                        setSearchResults([]);
                      }}
                      disabled={creating}
                    >
                      Avbryt
                    </Button>
                    <Button type="submit" className="flex-1" disabled={creating}>
                      {creating ? 'Behandler...' : showNameField ? 'Opprett organisasjon' : 'Søk'}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="name" className="space-y-4">
                <form onSubmit={handleSearchByName} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name-search">Firmanavn</Label>
                    <div className="flex gap-2">
                      <Input
                        id="org-name-search"
                        placeholder="Søk etter firmanavn..."
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                      />
                      <Button type="submit" disabled={creating}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Søk i Brønnøysundregisteret etter organisasjonsnavn
                    </p>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      <Label>Søkeresultater fra Brønnøysundregisteret</Label>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {searchResults.map((org: any) => (
                          <Button
                            key={org.organization_number}
                            variant="outline"
                            className="w-full justify-start h-auto py-3 text-left"
                            onClick={() => handleJoinOrganization(org)}
                            disabled={creating}
                          >
                            <div className="space-y-1 w-full">
                              <div className="font-semibold">{org.organization_name}</div>
                              <div className="text-xs text-muted-foreground">
                                Org.nr: {org.organization_number}
                              </div>
                              {org.organisasjonsform && (
                                <div className="text-xs text-muted-foreground">
                                  {org.organisasjonsform}
                                </div>
                              )}
                              {org.adresse && (
                                <div className="text-xs text-muted-foreground">
                                  {org.adresse}
                                </div>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowNewOrgForm(false);
                      setShowNameField(false);
                      setOrgNumber('');
                      setOrgName('');
                      setSearchResults([]);
                    }}
                    disabled={creating}
                  >
                    Avbryt
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const OrganizationSelector = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Laster...</p>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <OrganizationProvider userId={user.id}>
      <OrganizationSelectorContent />
    </OrganizationProvider>
  );
};

export default OrganizationSelector;
