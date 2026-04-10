-- Add weather widget settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_weather_widget boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS weather_location text,
ADD COLUMN IF NOT EXISTS show_weather_notifications boolean NOT NULL DEFAULT true;

-- Create weather_notifications table for storing weather alerts
CREATE TABLE IF NOT EXISTS public.weather_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL,
  weather_type text NOT NULL,
  temperature numeric,
  precipitation numeric,
  wind_speed numeric,
  created_at timestamptz DEFAULT now(),
  notified boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.weather_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for weather_notifications
CREATE POLICY "Users can view own weather notifications"
ON public.weather_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert weather notifications"
ON public.weather_notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete own weather notifications"
ON public.weather_notifications
FOR DELETE
USING (auth.uid() = user_id);