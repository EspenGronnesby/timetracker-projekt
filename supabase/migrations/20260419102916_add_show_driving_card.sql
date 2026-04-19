-- Toggle for Kjøring-kortet på "Min oversikt".
-- Bruker kan skru av/på km-visningen i Utseende-innstillinger.
-- Default true så eksisterende brukere ikke mister funksjonen.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_driving_card boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.show_driving_card IS
  'Når false, skjules Kjøring-kortet på Min oversikt.';
