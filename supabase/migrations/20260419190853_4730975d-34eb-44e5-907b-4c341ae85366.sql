-- Hide customer_phone and customer_email from non-owner project members
-- when hide_customer_info is true on the project.

-- Helper: check if current user is project owner
CREATE OR REPLACE FUNCTION public.can_view_project_customer_contact(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = _project_id
        AND (
          p.hide_customer_info = false
          OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = _project_id
              AND pm.user_id = auth.uid()
              AND pm.role = 'owner'
          )
          OR public.has_role(auth.uid(), 'admin')
        )
    );
$$;

-- Replace the broad SELECT policy on projects with a column-aware one.
-- Postgres RLS cannot restrict columns, so we keep row access but rely on the
-- secure view (projects_secure_member_view) for client reads. Add a comment
-- documenting this and revoke direct column SELECT on the sensitive columns
-- from the authenticated role, forcing clients to use the view.

REVOKE SELECT (customer_phone, customer_email, customer_address) ON public.projects FROM authenticated;
REVOKE SELECT (customer_phone, customer_email, customer_address) ON public.projects FROM anon;

-- Allow owners/admins to read sensitive columns via a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_project_customer_contact(_project_id uuid)
RETURNS TABLE (customer_phone text, customer_email text, customer_address text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.customer_phone, p.customer_email, p.customer_address
  FROM public.projects p
  WHERE p.id = _project_id
    AND (
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p.id
          AND pm.user_id = auth.uid()
          AND pm.role = 'owner'
      )
      OR public.has_role(auth.uid(), 'admin')
      OR (
        p.hide_customer_info = false
        AND EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
        )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_project_customer_contact(uuid) TO authenticated;