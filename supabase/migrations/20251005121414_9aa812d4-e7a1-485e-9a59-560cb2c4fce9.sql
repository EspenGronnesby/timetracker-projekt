-- Drop the problematic view
DROP VIEW IF EXISTS public.projects_view;

-- Instead, we'll handle data filtering in the application layer
-- The RLS policies ensure organizational boundaries, and the app will check roles for sensitive data

-- Make sure organization_number is not nullable for better security
-- We need to handle existing NULL values first
UPDATE public.profiles 
SET organization_number = 'PENDING' 
WHERE organization_number IS NULL;

ALTER TABLE public.profiles 
ALTER COLUMN organization_number SET NOT NULL;