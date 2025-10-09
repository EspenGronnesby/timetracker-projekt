-- Add color_theme column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN color_theme TEXT DEFAULT 'light' CHECK (color_theme IN ('light', 'dark', 'high-contrast-dark', 'ocean', 'forest', 'sunset'));