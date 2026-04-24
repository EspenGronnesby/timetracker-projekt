-- Stabil identifikator for system-opprettet Light-modus-prosjekt.
-- Tidligere ble "Standard arbeidsdag" identifisert kun ved navn, som gjorde
-- at bruker-opprettede prosjekter med samme navn ble skjult fra Pro.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_simple_project boolean NOT NULL DEFAULT false;

-- Backfill: eksisterende "Standard arbeidsdag"-prosjekter er alle
-- system-opprettet (brukere kunne ikke navngi slik før denne migreringen).
UPDATE public.projects
  SET is_simple_project = true
  WHERE name = 'Standard arbeidsdag' AND is_simple_project = false;

-- Gjenopprett projects_secure_member_view med flagget inkludert.
-- Kopiert fra 20260424120100_add_project_notes.sql + utvidet med is_simple_project.
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
  p.is_simple_project,
  p.created_by,
  p.created_at,
  p.completed,
  p.hide_customer_info,
  p.organization_id
FROM public.projects p
WHERE is_project_member(auth.uid(), p.id);

GRANT SELECT ON public.projects_secure_member_view TO authenticated;
