-- Drop the projects_member_view as it's not used in application code and lacks RLS
-- The application uses the base projects table with proper RLS policies
-- or the projects_secure_member_view which has proper security controls

DROP VIEW IF EXISTS public.projects_member_view;

-- Add comment to migration
COMMENT ON SCHEMA public IS 'Removed unused projects_member_view - application uses projects table with RLS or projects_secure_member_view';