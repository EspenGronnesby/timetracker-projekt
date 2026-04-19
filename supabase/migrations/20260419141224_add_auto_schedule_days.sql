-- Auto-schedule dagsvalg.
-- Lagrer array med ukedagstall (0=søndag, 1=mandag, ..., 6=lørdag)
-- som matcher JavaScripts Date.getDay(). Default = mandag-fredag.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auto_schedule_days integer[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5];

COMMENT ON COLUMN public.profiles.auto_schedule_days IS
  'Ukedager som auto-schedule kjører (0=søn, 1=man, ..., 6=lør). Default mandag-fredag.';
