-- Remove the insecure profiles_safe_view since views cannot have RLS policies
-- The AdminPanel will be updated to query the profiles table directly, which has proper RLS

DROP VIEW IF EXISTS profiles_safe_view;