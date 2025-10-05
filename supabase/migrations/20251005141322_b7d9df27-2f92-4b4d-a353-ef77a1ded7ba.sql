-- Remove duplicate membership insertion trigger causing unique constraint errors
DROP TRIGGER IF EXISTS add_creator_as_project_owner ON public.projects;