-- Create a secure view for profiles that masks fcm_token for other users
CREATE OR REPLACE VIEW public.profiles_safe_view AS
SELECT 
  p.id,
  p.name,
  p.organization_number,
  p.organization_name,
  p.show_team_invite,
  p.show_project_actions,
  p.show_activity_log,
  p.color_theme,
  p.created_at,
  CASE 
    WHEN p.id = auth.uid() THEN p.fcm_token
    ELSE NULL
  END as fcm_token
FROM public.profiles p
WHERE (p.id = auth.uid()) OR (
  EXISTS (
    SELECT 1
    FROM user_organizations uo1
    JOIN user_organizations uo2 ON uo1.organization_id = uo2.organization_id
    WHERE uo1.user_id = auth.uid() AND uo2.user_id = p.id
  )
);

COMMENT ON VIEW public.profiles_safe_view IS 'Secure view that exposes FCM tokens only to the profile owner, preventing token theft within organizations';