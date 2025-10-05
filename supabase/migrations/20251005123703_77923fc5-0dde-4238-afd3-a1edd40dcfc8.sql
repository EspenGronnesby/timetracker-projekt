-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_number text NOT NULL UNIQUE,
  organization_name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create user_organizations junction table (users can belong to multiple organizations)
CREATE TABLE IF NOT EXISTS public.user_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, organization_id)
);

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizations
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.organization_id = id AND uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS policies for user_organizations
CREATE POLICY "Users can view their own organization memberships"
  ON public.user_organizations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add themselves to organizations they create"
  ON public.user_organizations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Migrate existing data: create organizations from profiles
INSERT INTO public.organizations (organization_number, organization_name, created_by)
SELECT DISTINCT 
  COALESCE(organization_number, 'ORG-' || substr(md5(random()::text), 1, 8)),
  COALESCE(organization_name, 'Organization'),
  (SELECT id FROM profiles WHERE profiles.organization_number = p.organization_number LIMIT 1)
FROM profiles p
WHERE organization_number IS NOT NULL AND organization_number != 'PENDING'
ON CONFLICT (organization_number) DO NOTHING;

-- Link all users to their organizations
INSERT INTO public.user_organizations (user_id, organization_id)
SELECT p.id, o.id
FROM profiles p
JOIN organizations o ON o.organization_number = p.organization_number
WHERE p.organization_number IS NOT NULL AND p.organization_number != 'PENDING'
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Add organization_id to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Migrate existing projects to organizations
UPDATE public.projects
SET organization_id = (
  SELECT o.id 
  FROM profiles p
  JOIN organizations o ON o.organization_number = p.organization_number
  WHERE p.id = projects.created_by
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Update projects RLS policies to use organization_id
DROP POLICY IF EXISTS "Users can view projects in same organization" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project creator can update" ON public.projects;
DROP POLICY IF EXISTS "Project creator can delete" ON public.projects;

CREATE POLICY "Users can view projects in their organizations"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.organization_id = projects.organization_id 
      AND uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects in their organizations"
  ON public.projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.organization_id = organization_id 
      AND uo.user_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "Project creators can update their projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Project creators can delete their projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = created_by);

-- Update the can_access_project_sensitive_data function to work with organizations
CREATE OR REPLACE FUNCTION public.can_access_project_sensitive_data(project_created_by uuid, project_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() = project_created_by OR 
    (public.has_role(auth.uid(), 'admin') AND EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.organization_id = project_org_id AND uo.user_id = auth.uid()
    ));
$$;

-- Update the secure projects view
DROP VIEW IF EXISTS public.projects_secure;
CREATE VIEW public.projects_secure AS
SELECT 
  p.id,
  p.name,
  p.color,
  p.created_by,
  p.organization_id,
  p.created_at,
  p.contract_number,
  p.description,
  CASE 
    WHEN public.can_access_project_sensitive_data(p.created_by, p.organization_id) 
    THEN p.customer_name 
    ELSE NULL 
  END AS customer_name,
  CASE 
    WHEN public.can_access_project_sensitive_data(p.created_by, p.organization_id) 
    THEN p.customer_address 
    ELSE NULL 
  END AS customer_address,
  CASE 
    WHEN public.can_access_project_sensitive_data(p.created_by, p.organization_id) 
    THEN p.customer_phone 
    ELSE NULL 
  END AS customer_phone,
  CASE 
    WHEN public.can_access_project_sensitive_data(p.created_by, p.organization_id) 
    THEN p.customer_email 
    ELSE NULL 
  END AS customer_email
FROM public.projects p;

GRANT SELECT ON public.projects_secure TO authenticated;