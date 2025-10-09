-- Add hide_customer_info column to projects table
ALTER TABLE public.projects
ADD COLUMN hide_customer_info boolean NOT NULL DEFAULT false;

-- Update create_project function to include hide_customer_info parameter
CREATE OR REPLACE FUNCTION public.create_project(
  p_name text,
  p_color text,
  p_customer_name text,
  p_customer_address text,
  p_customer_phone text,
  p_customer_email text,
  p_contract_number text,
  p_description text,
  p_hide_customer_info boolean DEFAULT false
)
RETURNS projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_project public.projects;
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select organization_id into v_org_id
  from public.user_organizations
  where user_id = auth.uid()
  limit 1;

  insert into public.projects (
    name, color, customer_name, customer_address, customer_phone, customer_email,
    contract_number, description, created_by, organization_id, hide_customer_info
  ) values (
    p_name, p_color, p_customer_name, p_customer_address, p_customer_phone, p_customer_email,
    p_contract_number, p_description, auth.uid(), v_org_id, p_hide_customer_info
  )
  returning * into v_project;

  -- Ensure membership as owner (fallback if trigger didn't fire)
  insert into public.project_members (project_id, user_id, role)
  values (v_project.id, auth.uid(), 'owner')
  on conflict do nothing;

  return v_project;
end;
$function$;