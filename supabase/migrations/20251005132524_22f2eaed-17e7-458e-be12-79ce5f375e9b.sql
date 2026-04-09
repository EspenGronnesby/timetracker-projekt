-- Create function to check if user is project owner
CREATE OR REPLACE FUNCTION public.is_project_owner(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = _project_id
      AND user_id = _user_id
      AND role = 'owner'
  )
$$;

-- Drop old view if exists
DROP VIEW IF EXISTS public.projects_with_access;

-- Create secure view that conditionally shows customer data
CREATE OR REPLACE VIEW public.projects_member_view 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.name,
  p.color,
  p.created_by,
  p.created_at,
  p.contract_number,
  p.description,
  -- Only show sensitive customer data if user is project owner
  CASE
    WHEN public.is_project_owner(auth.uid(), p.id) 
    THEN p.customer_name
    ELSE 'Customer'::text  -- Show generic placeholder for members
  END AS customer_name,
  CASE
    WHEN public.is_project_owner(auth.uid(), p.id) 
    THEN p.customer_address
    ELSE NULL::text
  END AS customer_address,
  CASE
    WHEN public.is_project_owner(auth.uid(), p.id) 
    THEN p.customer_phone
    ELSE NULL::text
  END AS customer_phone,
  CASE
    WHEN public.is_project_owner(auth.uid(), p.id) 
    THEN p.customer_email
    ELSE NULL::text
  END AS customer_email
FROM projects p;

-- Grant SELECT access to authenticated users
GRANT SELECT ON public.projects_member_view TO authenticated;

-- Add comment explaining the view
COMMENT ON VIEW public.projects_member_view IS 'Secure view that filters sensitive customer data based on project role. Only project owners can see full customer contact information.';

-- Add RLS policy for the view
-- Note: Views with security_invoker=true inherit RLS from underlying tables
-- The view respects project_members access control through the underlying projects table RLS