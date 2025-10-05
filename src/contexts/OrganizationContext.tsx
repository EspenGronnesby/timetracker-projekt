import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Organization {
  id: string;
  organization_number: string;
  organization_name: string;
}

interface OrganizationContextType {
  selectedOrganization: Organization | null;
  organizations: Organization[];
  selectOrganization: (org: Organization) => void;
  loading: boolean;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children, userId }: { children: ReactNode; userId: string | undefined }) => {
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_organizations')
        .select('organization_id, organizations(id, organization_number, organization_name)')
        .eq('user_id', userId);

      if (error) throw error;

      const orgs = data?.map(item => item.organizations).filter(Boolean) as Organization[];
      setOrganizations(orgs);

      // Auto-select if only one organization or restore from localStorage
      const savedOrgId = localStorage.getItem('selectedOrganizationId');
      if (savedOrgId && orgs.find(o => o.id === savedOrgId)) {
        setSelectedOrganization(orgs.find(o => o.id === savedOrgId)!);
      } else if (orgs.length === 1) {
        setSelectedOrganization(orgs[0]);
        localStorage.setItem('selectedOrganizationId', orgs[0].id);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [userId]);

  const selectOrganization = (org: Organization) => {
    setSelectedOrganization(org);
    localStorage.setItem('selectedOrganizationId', org.id);
  };

  const refreshOrganizations = async () => {
    await fetchOrganizations();
  };

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganization,
        organizations,
        selectOrganization,
        loading,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
