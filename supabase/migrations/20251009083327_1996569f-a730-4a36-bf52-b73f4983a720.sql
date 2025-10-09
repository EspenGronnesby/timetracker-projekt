-- Add user preferences for project details visibility
ALTER TABLE public.profiles
ADD COLUMN show_team_invite boolean NOT NULL DEFAULT false,
ADD COLUMN show_project_actions boolean NOT NULL DEFAULT false,
ADD COLUMN show_activity_log boolean NOT NULL DEFAULT false;