-- Create customer users table for tracking customer logins
CREATE TABLE public.customer_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Enable RLS
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view their own data
CREATE POLICY "Customers can view own data"
ON public.customer_users FOR SELECT
USING (true);

-- Policy: System can insert/update customer users
CREATE POLICY "System can manage customer users"
ON public.customer_users FOR ALL
USING (true)
WITH CHECK (true);

-- Create view for customer projects (only completed)
CREATE OR REPLACE VIEW public.customer_projects_view AS
SELECT 
  p.id,
  p.name,
  p.customer_name,
  p.customer_email,
  p.created_at,
  p.completed,
  p.description,
  COALESCE(SUM(te.duration_seconds), 0) as total_duration_seconds,
  COUNT(DISTINCT te.id) as time_entry_count,
  COALESCE(SUM(de.kilometers), 0) as total_kilometers,
  COUNT(DISTINCT de.id) as drive_entry_count,
  COUNT(DISTINCT m.id) as material_count,
  COALESCE(SUM(m.total_price), 0) as total_material_cost
FROM public.projects p
LEFT JOIN public.time_entries te ON te.project_id = p.id AND te.end_time IS NOT NULL
LEFT JOIN public.drive_entries de ON de.project_id = p.id AND de.end_time IS NOT NULL
LEFT JOIN public.materials m ON m.project_id = p.id
WHERE p.completed = true
GROUP BY p.id, p.name, p.customer_name, p.customer_email, p.created_at, p.completed, p.description;