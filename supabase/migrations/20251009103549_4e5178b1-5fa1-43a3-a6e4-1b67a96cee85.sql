-- Create goal_lists table
CREATE TABLE public.goal_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create goal_tasks table
CREATE TABLE public.goal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  list_id UUID NOT NULL REFERENCES public.goal_lists(id) ON DELETE CASCADE,
  user_id UUID,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  points INTEGER NOT NULL DEFAULT 5,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_goal_lists_user_id ON public.goal_lists(user_id);
CREATE INDEX idx_goal_lists_order ON public.goal_lists(order_index);
CREATE INDEX idx_goal_tasks_list_id ON public.goal_tasks(list_id);
CREATE INDEX idx_goal_tasks_user_id ON public.goal_tasks(user_id);

-- Disable RLS (no authentication required)
ALTER TABLE public.goal_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_tasks DISABLE ROW LEVEL SECURITY;