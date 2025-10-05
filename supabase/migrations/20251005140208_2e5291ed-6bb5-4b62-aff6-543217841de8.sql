-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;

-- Create more robust INSERT policy that explicitly checks authentication
CREATE POLICY "Authenticated users can create projects" 
ON public.projects 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by AND created_by IS NOT NULL);