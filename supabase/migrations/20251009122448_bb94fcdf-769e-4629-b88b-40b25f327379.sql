-- Update function to allow all project members to access customer data
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
  ) OR public.has_role(auth.uid(), 'admin');
$$;