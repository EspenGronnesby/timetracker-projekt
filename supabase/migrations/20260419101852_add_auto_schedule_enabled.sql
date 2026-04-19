-- Fase 6: Automatisk tidsplan
-- Legg til flagg i profiles for å aktivere auto-timer som starter/pauser/stopper
-- arbeidsdagen basert på default_start_time, default_breakfast_time,
-- default_lunch_time og default_end_time.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auto_schedule_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.auto_schedule_enabled IS
  'Når true, automatiserer appen start/pause/stopp av timeren basert på default_*_time-feltene.';
