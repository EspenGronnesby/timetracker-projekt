-- Add organization fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN organization_number TEXT,
ADD COLUMN organization_name TEXT;

-- Create function to get user's organization number
CREATE OR REPLACE FUNCTION public.get_user_organization(user_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_number
  FROM public.profiles
  WHERE id = user_id;
$$;

-- Update RLS policies for projects table
DROP POLICY "Users can view all projects" ON public.projects;
CREATE POLICY "Users can view projects in same organization" ON public.projects
FOR SELECT USING (
  public.get_user_organization(auth.uid()) = public.get_user_organization(created_by)
  AND public.get_user_organization(auth.uid()) IS NOT NULL
);

-- Update RLS policies for time_entries table
DROP POLICY "Users can view all time entries" ON public.time_entries;
CREATE POLICY "Users can view time entries in same organization" ON public.time_entries
FOR SELECT USING (
  public.get_user_organization(auth.uid()) = public.get_user_organization(user_id)
  AND public.get_user_organization(auth.uid()) IS NOT NULL
);

-- Update RLS policies for drive_entries table
DROP POLICY "Users can view all drive entries" ON public.drive_entries;
CREATE POLICY "Users can view drive entries in same organization" ON public.drive_entries
FOR SELECT USING (
  public.get_user_organization(auth.uid()) = public.get_user_organization(user_id)
  AND public.get_user_organization(auth.uid()) IS NOT NULL
);

-- Update RLS policies for materials table
DROP POLICY "Users can view all materials" ON public.materials;
CREATE POLICY "Users can view materials in same organization" ON public.materials
FOR SELECT USING (
  public.get_user_organization(auth.uid()) = public.get_user_organization(user_id)
  AND public.get_user_organization(auth.uid()) IS NOT NULL
);

-- Update RLS policies for profiles table
DROP POLICY "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in same organization" ON public.profiles
FOR SELECT USING (
  public.get_user_organization(auth.uid()) = organization_number
  AND public.get_user_organization(auth.uid()) IS NOT NULL
);