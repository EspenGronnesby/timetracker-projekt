-- Phase 1: Create project invitation system tables

-- Create project_invites table
CREATE TABLE public.project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invite_code text UNIQUE NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0
);

-- Create project_members table
CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_invites
CREATE POLICY "Project owners can view their invites"
  ON public.project_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_invites.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role = 'owner'
    )
  );

CREATE POLICY "Project owners can create invites"
  ON public.project_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_invites.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role = 'owner'
    )
  );

CREATE POLICY "Project owners can delete invites"
  ON public.project_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_invites.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role = 'owner'
    )
  );

-- RLS policies for project_members
CREATE POLICY "Users can view members of their projects"
  ON public.project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert project members"
  ON public.project_members FOR INSERT
  WITH CHECK (true);

-- Phase 2: Update projects table and RLS policies

-- Make organization_id nullable
ALTER TABLE public.projects ALTER COLUMN organization_id DROP NOT NULL;

-- Drop old RLS policies on projects
DROP POLICY IF EXISTS "Users can view projects in their organizations" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects in their organizations" ON public.projects;
DROP POLICY IF EXISTS "Project creators can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Project creators can delete their projects" ON public.projects;

-- Create new membership-based RLS policies for projects
CREATE POLICY "Users can view their project memberships"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project owners can update projects"
  ON public.projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.role = 'owner'
    )
  );

CREATE POLICY "Project owners can delete projects"
  ON public.projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.role = 'owner'
    )
  );

-- Update RLS policies on time_entries
DROP POLICY IF EXISTS "Users can view time entries in same organization" ON public.time_entries;
CREATE POLICY "Users can view time entries in their projects"
  ON public.time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = time_entries.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- Update RLS policies on drive_entries
DROP POLICY IF EXISTS "Users can view drive entries in same organization" ON public.drive_entries;
CREATE POLICY "Users can view drive entries in their projects"
  ON public.drive_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = drive_entries.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- Update RLS policies on materials
DROP POLICY IF EXISTS "Users can view materials in same organization" ON public.materials;
CREATE POLICY "Users can view materials in their projects"
  ON public.materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = materials.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- Create function to auto-add creator as owner when project is created
CREATE OR REPLACE FUNCTION public.add_creator_as_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;

-- Create trigger to automatically add creator as owner
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_owner();