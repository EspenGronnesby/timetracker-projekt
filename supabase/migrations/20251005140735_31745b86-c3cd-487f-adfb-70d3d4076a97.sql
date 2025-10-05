-- Create a SECURITY DEFINER function to create projects safely
create or replace function public.create_project(
  p_name text,
  p_color text,
  p_customer_name text,
  p_customer_address text,
  p_customer_phone text,
  p_customer_email text,
  p_contract_number text,
  p_description text
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
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
    contract_number, description, created_by, organization_id
  ) values (
    p_name, p_color, p_customer_name, p_customer_address, p_customer_phone, p_customer_email,
    p_contract_number, p_description, auth.uid(), v_org_id
  )
  returning * into v_project;

  -- Ensure membership as owner (fallback if trigger didn't fire)
  insert into public.project_members (project_id, user_id, role)
  values (v_project.id, auth.uid(), 'owner')
  on conflict do nothing;

  return v_project;
end;
$$;

-- Restrict and grant execute
revoke all on function public.create_project(text, text, text, text, text, text, text, text) from public;
grant execute on function public.create_project(text, text, text, text, text, text, text, text) to authenticated;