
-- 1. Fix weather_notifications: restrict INSERT to service_role only
DROP POLICY IF EXISTS "System can insert weather notifications" ON public.weather_notifications;
CREATE POLICY "Service role can insert weather notifications"
ON public.weather_notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. Fix user_roles: restrict mutation policies to authenticated role
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- 3. Also tighten notifications INSERT policy - restrict to service role + self
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Service role and self can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated, service_role
WITH CHECK (
  (auth.jwt() ->> 'role' = 'service_role') OR (auth.uid() = user_id)
);
