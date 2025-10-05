-- Create security definer function to check project membership
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
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
  )
$$;

-- Drop the existing recursive policy
DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;

-- Create new policy using the security definer function
CREATE POLICY "Users can view members of their projects"
ON public.project_members
FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));