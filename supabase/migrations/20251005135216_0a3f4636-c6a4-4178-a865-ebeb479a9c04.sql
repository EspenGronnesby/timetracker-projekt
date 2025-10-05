-- Create trigger to automatically add project creator as owner
CREATE TRIGGER add_creator_as_project_owner
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_owner();