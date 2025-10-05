-- Update the handle_new_user function to auto-create a personal organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id uuid;
  user_name text;
BEGIN
  -- Determine user name
  user_name := COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  
  -- Insert profile with just name, no organization info required
  INSERT INTO public.profiles (id, name, organization_number, organization_name)
  VALUES (
    new.id,
    user_name,
    new.raw_user_meta_data->>'organization_number',
    new.raw_user_meta_data->>'organization_name'
  );
  
  -- Create a personal organization for the user
  INSERT INTO public.organizations (organization_number, organization_name, created_by)
  VALUES (
    'PERSONAL-' || new.id,
    user_name || '''s Workspace',
    new.id
  )
  RETURNING id INTO new_org_id;
  
  -- Link user to their personal organization
  INSERT INTO public.user_organizations (user_id, organization_id)
  VALUES (new.id, new_org_id);
  
  RETURN new;
END;
$$;