-- Create a function to check if user can access sensitive project data
-- (must be project creator or admin)
CREATE OR REPLACE FUNCTION public.can_access_project_sensitive_data(project_created_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() = project_created_by OR 
    public.has_role(auth.uid(), 'admin');
$$;

-- Create a secure view that masks sensitive customer data for unauthorized users
CREATE OR REPLACE VIEW public.projects_secure AS
SELECT 
  p.id,
  p.name,
  p.color,
  p.created_by,
  p.created_at,
  p.contract_number,
  p.description,
  -- Conditionally show sensitive customer data only to authorized users
  CASE 
    WHEN public.can_access_project_sensitive_data(p.created_by) 
    THEN p.customer_name 
    ELSE NULL 
  END AS customer_name,
  CASE 
    WHEN public.can_access_project_sensitive_data(p.created_by) 
    THEN p.customer_address 
    ELSE NULL 
  END AS customer_address,
  CASE 
    WHEN public.can_access_project_sensitive_data(p.created_by) 
    THEN p.customer_phone 
    ELSE NULL 
  END AS customer_phone,
  CASE 
    WHEN public.can_access_project_sensitive_data(p.created_by) 
    THEN p.customer_email 
    ELSE NULL 
  END AS customer_email
FROM public.projects p;

-- Grant SELECT on the secure view to authenticated users
GRANT SELECT ON public.projects_secure TO authenticated;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.projects_secure IS 'Secure view of projects that masks sensitive customer contact information (phone, email, address, name) for users who are neither the project creator nor administrators. This prevents unauthorized access to customer data while maintaining project visibility across the organization.';