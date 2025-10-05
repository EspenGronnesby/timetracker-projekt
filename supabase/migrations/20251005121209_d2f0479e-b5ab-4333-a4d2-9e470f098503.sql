-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view roles in same organization" ON public.user_roles
FOR SELECT USING (
  public.get_user_organization(auth.uid()) = public.get_user_organization(user_id)
  AND public.get_user_organization(auth.uid()) IS NOT NULL
);

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT WITH CHECK (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE USING (
  public.is_admin(auth.uid())
);

-- Add DELETE policy to profiles table
CREATE POLICY "Prevent profile deletion" ON public.profiles
FOR DELETE USING (false);

-- Create view for projects with selective field visibility
CREATE OR REPLACE VIEW public.projects_view AS
SELECT 
  p.id,
  p.name,
  p.color,
  p.created_by,
  p.created_at,
  p.description,
  p.contract_number,
  -- Only show sensitive customer data if user is admin or project creator
  CASE 
    WHEN public.is_admin(auth.uid()) OR p.created_by = auth.uid() 
    THEN p.customer_name 
    ELSE '[Skjult - kun admin/skaper]' 
  END AS customer_name,
  CASE 
    WHEN public.is_admin(auth.uid()) OR p.created_by = auth.uid() 
    THEN p.customer_email 
    ELSE NULL 
  END AS customer_email,
  CASE 
    WHEN public.is_admin(auth.uid()) OR p.created_by = auth.uid() 
    THEN p.customer_phone 
    ELSE NULL 
  END AS customer_phone,
  CASE 
    WHEN public.is_admin(auth.uid()) OR p.created_by = auth.uid() 
    THEN p.customer_address 
    ELSE NULL 
  END AS customer_address
FROM public.projects p
WHERE 
  public.get_user_organization(auth.uid()) = public.get_user_organization(p.created_by)
  AND public.get_user_organization(auth.uid()) IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON public.projects_view TO authenticated;

COMMENT ON VIEW public.projects_view IS 'View that restricts sensitive customer data to admins and project creators only';