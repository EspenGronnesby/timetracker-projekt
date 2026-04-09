-- Fix Security Definer View warning
-- Recreate projects_secure_member_view with security_invoker = true
DROP VIEW IF EXISTS public.projects_secure_member_view;

CREATE OR REPLACE VIEW public.projects_secure_member_view
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.name,
  p.color,
  p.customer_name,
  -- Only show sensitive customer data if:
  -- 1. User is project creator/owner, OR
  -- 2. hide_customer_info is false (customer info not hidden)
  CASE 
    WHEN p.hide_customer_info = false OR can_access_project_sensitive_data(p.created_by, p.organization_id)
    THEN p.customer_address
    ELSE NULL
  END as customer_address,
  CASE 
    WHEN p.hide_customer_info = false OR can_access_project_sensitive_data(p.created_by, p.organization_id)
    THEN p.customer_phone
    ELSE NULL
  END as customer_phone,
  CASE 
    WHEN p.hide_customer_info = false OR can_access_project_sensitive_data(p.created_by, p.organization_id)
    THEN p.customer_email
    ELSE NULL
  END as customer_email,
  p.contract_number,
  p.description,
  p.created_by,
  p.created_at,
  p.completed,
  p.hide_customer_info,
  p.organization_id
FROM public.projects p
WHERE is_project_member(auth.uid(), p.id);