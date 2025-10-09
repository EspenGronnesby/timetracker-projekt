-- SECURITY FIX 1: Fix Critical Project Members Access Control
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert project members" ON public.project_members;

-- Create restricted policies for project_members
CREATE POLICY "Project owners can add members"
ON public.project_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  )
);

CREATE POLICY "Creators can add themselves as owner"
ON public.project_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND role = 'owner'
);

-- Allow users to leave projects (delete their own membership)
CREATE POLICY "Users can leave projects"
ON public.project_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND role != 'owner');

-- SECURITY FIX 2: Isolate FCM Tokens
-- Create separate table for FCM tokens with strict RLS
CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  fcm_token text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Only users can manage their own FCM token
CREATE POLICY "Users can manage own FCM token"
ON public.user_fcm_tokens
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Migrate existing FCM tokens from profiles
INSERT INTO public.user_fcm_tokens (user_id, fcm_token)
SELECT id, fcm_token 
FROM public.profiles 
WHERE fcm_token IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Drop and recreate profiles_safe_view without fcm_token
DROP VIEW IF EXISTS public.profiles_safe_view;

-- Drop fcm_token column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS fcm_token;

-- Recreate profiles_safe_view without fcm_token
CREATE OR REPLACE VIEW public.profiles_safe_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  color_theme,
  organization_number,
  organization_name,
  created_at,
  show_activity_log,
  show_project_actions,
  show_team_invite
FROM public.profiles;