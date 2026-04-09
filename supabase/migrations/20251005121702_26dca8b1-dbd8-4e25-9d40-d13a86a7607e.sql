-- Update handle_new_user function to assign admin role to first user in organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, name, organization_number, organization_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'organization_number',
    new.raw_user_meta_data->>'organization_name'
  );
  
  -- Check if this is the first user in the organization
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE organization_number = new.raw_user_meta_data->>'organization_number'
    AND id != new.id
  ) INTO is_first_user;
  
  -- If first user in organization, make them admin
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin');
  END IF;
  
  RETURN new;
END;
$$;