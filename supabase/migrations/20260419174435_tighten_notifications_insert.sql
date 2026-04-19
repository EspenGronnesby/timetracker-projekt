-- Sikkerhet: stramme INSERT-policy på notifications.
-- Tidligere policy hadde WITH CHECK (true) som lot enhver autentisert
-- bruker opprette notifications for alle andre brukere.
--
-- Etter endringen kan en autentisert bruker kun opprette notifications
-- der user_id matcher sin egen auth.uid(). Edge functions
-- (daily-summary, check-weather-forecast) bruker SUPABASE_SERVICE_ROLE_KEY
-- som bypasser RLS helt, så de fortsetter uendret.

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
