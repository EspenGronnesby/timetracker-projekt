-- Recreate the view with SECURITY INVOKER to fix the security linter warning
DROP VIEW IF EXISTS public.projects_member_view;

CREATE VIEW public.projects_member_view 
WITH (security_invoker=true)
AS
SELECT 
  p.id,
  p.name,
  p.color,
  p.customer_name,
  p.customer_address,
  p.customer_phone,
  p.customer_email,
  p.contract_number,
  p.description,
  p.created_by,
  p.created_at,
  p.completed
FROM public.projects p
INNER JOIN public.project_members pm ON p.id = pm.project_id
WHERE pm.user_id = auth.uid();