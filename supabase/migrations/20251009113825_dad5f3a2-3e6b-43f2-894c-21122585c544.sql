-- Step 1: Create security definer function to check customer data access
CREATE OR REPLACE FUNCTION public.can_access_customer_data(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id
    AND user_id = auth.uid()
    AND role = 'owner'
  ) OR public.has_role(auth.uid(), 'admin');
$$;

-- Step 2: Create a secure view that conditionally returns customer data
CREATE OR REPLACE VIEW public.projects_secure_member_view AS
SELECT 
  p.id,
  p.name,
  p.color,
  p.created_by,
  p.created_at,
  p.organization_id,
  p.completed,
  p.contract_number,
  p.description,
  p.customer_name,
  CASE 
    WHEN public.can_access_customer_data(p.id) THEN p.customer_address
    ELSE NULL
  END as customer_address,
  CASE 
    WHEN public.can_access_customer_data(p.id) THEN p.customer_phone
    ELSE NULL
  END as customer_phone,
  CASE 
    WHEN public.can_access_customer_data(p.id) THEN p.customer_email
    ELSE NULL
  END as customer_email
FROM public.projects p
WHERE EXISTS (
  SELECT 1 FROM public.project_members pm
  WHERE pm.project_id = p.id
  AND pm.user_id = auth.uid()
);

-- Step 3: Add UPDATE/DELETE policies to organizations table
CREATE POLICY "Organization creators can update"
ON public.organizations
FOR UPDATE
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Organization creators can delete"
ON public.organizations
FOR DELETE
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));