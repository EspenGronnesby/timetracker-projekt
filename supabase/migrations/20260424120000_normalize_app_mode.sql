-- Normaliser app_mode: 'simple' er gammelt navn, erstattes av 'light'.
-- Idempotent: kan re-kjøres uten feil selv om constraint eller andre
-- uventede verdier allerede finnes.

-- Normaliser alle ikke-kanoniske verdier til 'light' (inkludert NULL,
-- tomme strenger, og eventuelle andre gamle verdier).
UPDATE public.profiles
  SET app_mode = 'light'
  WHERE app_mode IS NULL OR app_mode NOT IN ('light', 'pro');

ALTER TABLE public.profiles ALTER COLUMN app_mode SET DEFAULT 'light';

-- Fjern en tidligere versjon av constraint-en hvis den finnes, så vi
-- kan legge den til på nytt uten konflikt.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_app_mode_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_app_mode_check
  CHECK (app_mode IN ('light', 'pro'));
