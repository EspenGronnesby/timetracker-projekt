-- Drop and recreate the projects_secure_member_view to include hide_customer_info
DROP VIEW IF EXISTS public.projects_secure_member_view;

CREATE VIEW public.projects_secure_member_view AS
SELECT 
  p.id,
  p.name,
  p.color,
  p.created_by,
  p.created_at,
  p.completed,
  p.organization_id,
  p.hide_customer_info,
  CASE 
    WHEN can_access_project_sensitive_data(p.created_by, p.organization_id) THEN p.customer_name
    ELSE p.customer_name
  END as customer_name,
  CASE 
    WHEN can_access_project_sensitive_data(p.created_by, p.organization_id) THEN p.customer_address
    ELSE NULL
  END as customer_address,
  CASE 
    WHEN can_access_project_sensitive_data(p.created_by, p.organization_id) THEN p.customer_phone
    ELSE NULL
  END as customer_phone,
  CASE 
    WHEN can_access_project_sensitive_data(p.created_by, p.organization_id) THEN p.customer_email
    ELSE NULL
  END as customer_email,
  CASE 
    WHEN can_access_project_sensitive_data(p.created_by, p.organization_id) THEN p.contract_number
    ELSE NULL
  END as contract_number,
  CASE 
    WHEN can_access_project_sensitive_data(p.created_by, p.organization_id) THEN p.description
    ELSE NULL
  END as description
FROM public.projects p;