import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const orgSchema = z.object({
  organization_number: z.string().trim().min(1, 'Organisasjonsnummer er påkrevd').max(20, 'Må være mindre enn 20 tegn'),
  organization_name: z.string().trim().min(1, 'Firmanavn er påkrevd').max(100, 'Må være mindre enn 100 tegn'),
});

const OrganizationSelector = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizations, selectOrganization, loading, refreshOrganizations } = useOrganization();
  const { toast } = useToast();
  const [showNewOrgForm, setShowNewOrgForm] = useState(false);
  const [orgNumber, setOrgNumber] = useState('');
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSelectOrganization = (org: any) => {
    selectOrganization(org);
    navigate('/');
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const validated = orgSchema.parse({
        organization_number: orgNumber,
        organization_name: orgName,
      });

      // Check if organization exists
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id, organization_number, organization_name')
        .eq('organization_number', validated.organization_number)
        .maybeSingle();

      if (existingOrg) {
        // Join existing organization
        const { error: joinError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: user!.id,
            organization_id: existingOrg.id,
          });

        if (joinError) {
          if (joinError.code === '23505') { // Duplicate key
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
          title: 'Velkommen tilbake!',
          description: `Du har blitt lagt til i ${existingOrg.organization_name}`,
        });

        await refreshOrganizations();
        selectOrganization(existingOrg);
        navigate('/');
      } else {
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
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Valideringsfeil',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        console.error('Error creating/joining organization:', error);
        toast({
          title: 'Feil',
          description: 'Kunne ikke opprette/bli med i organisasjon',
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
            Velg hvilken organisasjon du vil jobbe med, eller opprett/bli med i en ny
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
              {organizations.length === 0 ? 'Opprett organisasjon' : 'Legg til organisasjon'}
            </Button>
          ) : (
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-number">Organisasjonsnummer *</Label>
                <Input
                  id="org-number"
                  placeholder="123456789"
                  value={orgNumber}
                  onChange={(e) => setOrgNumber(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Hvis organisasjonen finnes blir du lagt til, ellers opprettes den
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-name">Firmanavn *</Label>
                <Input
                  id="org-name"
                  placeholder="Mitt Firma AS"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowNewOrgForm(false)}
                  disabled={creating}
                >
                  Avbryt
                </Button>
                <Button type="submit" className="flex-1" disabled={creating}>
                  {creating ? 'Behandler...' : 'Fortsett'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationSelector;
