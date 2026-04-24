-- Legg til notes-kolonne på projects for per-prosjekt notater.
-- RLS dekkes av eksisterende row-level-policies på projects (eier/admin kan
-- oppdatere). Notater regnes ikke som sensitiv kundedata, så alle
-- prosjektmedlemmer kan lese dem (ingen CASE-gate i view).

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS notes text;

-- Gjenopprett projects_secure_member_view med notes-kolonnen inkludert.
-- Kopiert fra 20251009133131_*.sql og utvidet med p.notes.
DROP VIEW IF EXISTS public.projects_secure_member_view;

CREATE OR REPLACE VIEW public.projects_secure_member_view
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.name,
  p.color,
  p.customer_name,
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
  p.notes,
  p.created_by,
  p.created_at,
  p.completed,
  p.hide_customer_info,
  p.organization_id
FROM public.projects p
WHERE is_project_member(auth.uid(), p.id);

-- Eksplisitt grant så klienten får lese-tilgang uavhengig av default-
-- privilegier. Uten dette kan strengere Postgres defaults gi
-- "permission denied" på useProjects-queryen.
GRANT SELECT ON public.projects_secure_member_view TO authenticated;
