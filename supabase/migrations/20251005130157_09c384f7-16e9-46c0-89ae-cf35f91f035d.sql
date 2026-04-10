-- Create a function to automatically grant admin role to organization creators
CREATE OR REPLACE FUNCTION public.grant_admin_to_org_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Grant admin role to the creator of the organization
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.created_by, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically grant admin role when organization is created
DROP TRIGGER IF EXISTS on_organization_created ON organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_admin_to_org_creator();