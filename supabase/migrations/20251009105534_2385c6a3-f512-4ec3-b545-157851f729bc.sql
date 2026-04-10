-- Enable Row Level Security on goal_lists and goal_tasks
ALTER TABLE public.goal_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_lists
CREATE POLICY "Users can view own goal lists"
ON public.goal_lists
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goal lists"
ON public.goal_lists
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal lists"
ON public.goal_lists
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal lists"
ON public.goal_lists
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for goal_tasks
CREATE POLICY "Users can view own goal tasks"
ON public.goal_tasks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goal tasks"
ON public.goal_tasks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal tasks"
ON public.goal_tasks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal tasks"
ON public.goal_tasks
FOR DELETE
USING (auth.uid() = user_id);