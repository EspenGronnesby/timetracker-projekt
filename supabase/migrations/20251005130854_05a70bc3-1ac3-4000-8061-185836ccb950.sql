-- Drop the unused projects_secure view that has security issues
-- This view uses SECURITY DEFINER mode and has no RLS policies,
-- creating a security vulnerability. It's not used in the application.
DROP VIEW IF EXISTS public.projects_secure;