-- Add fields to time_entries for manual registration tracking
ALTER TABLE public.time_entries
ADD COLUMN is_manual boolean NOT NULL DEFAULT false,
ADD COLUMN comment text;