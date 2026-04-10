-- Add cost calculator visibility setting to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_cost_calculator boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.show_cost_calculator IS 'Whether to show the cost calculator feature on project details pages';