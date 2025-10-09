-- Enable realtime for goal_lists and goal_tasks tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_tasks;