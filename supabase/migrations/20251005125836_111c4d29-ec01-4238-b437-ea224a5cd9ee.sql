-- Step 1: Make organization_number and organization_name nullable in profiles
ALTER TABLE profiles 
ALTER COLUMN organization_number DROP NOT NULL,
ALTER COLUMN organization_name DROP NOT NULL;

-- Step 2: Clean up the user's profile to remove PENDING status
UPDATE profiles 
SET organization_number = NULL, organization_name = NULL
WHERE id = '0d167240-5aed-4e09-bdb0-5d9c99183496';

-- Step 3: Update handle_new_user function to not require organization info during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile with just name, no organization info required
  INSERT INTO public.profiles (id, name, organization_number, organization_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'organization_number',
    new.raw_user_meta_data->>'organization_name'
  );
  
  RETURN new;
END;
$function$;