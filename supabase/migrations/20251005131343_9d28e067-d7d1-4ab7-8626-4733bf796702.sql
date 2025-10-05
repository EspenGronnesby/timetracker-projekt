-- Create a secure view that conditionally shows customer data
-- Only project creators and admins can see customer contact information
-- Using security_invoker=true to respect RLS and run with caller's permissions
CREATE OR REPLACE VIEW public.projects_with_access 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.name,
  p.color,
  p.created_by,
  p.organization_id,
  p.created_at,
  p.contract_number,
  p.description,
  -- Only show customer data if user is creator or admin in the same org
  CASE
    WHEN can_access_project_sensitive_data(p.created_by, p.organization_id) 
    THEN p.customer_name
    ELSE NULL::text
  END AS customer_name,
  CASE
    WHEN can_access_project_sensitive_data(p.created_by, p.organization_id) 
    THEN p.customer_address
    ELSE NULL::text
  END AS customer_address,
  CASE
    WHEN can_access_project_sensitive_data(p.created_by, p.organization_id) 
    THEN p.customer_phone
    ELSE NULL::text
  END AS customer_phone,
  CASE
    WHEN can_access_project_sensitive_data(p.created_by, p.organization_id) 
    THEN p.customer_email
    ELSE NULL::text
  END AS customer_email
FROM projects p;

-- Grant SELECT access to authenticated users
GRANT SELECT ON public.projects_with_access TO authenticated;