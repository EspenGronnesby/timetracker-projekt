
CREATE TABLE public.breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  break_type text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own breaks" ON public.breaks FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.wage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  hourly_rate numeric NOT NULL DEFAULT 0,
  overtime_threshold numeric NOT NULL DEFAULT 7.5,
  overtime_multiplier numeric NOT NULL DEFAULT 1.5,
  default_lunch_minutes integer NOT NULL DEFAULT 30,
  lunch_is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wage settings" ON public.wage_settings FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.profiles ADD COLUMN app_mode text NOT NULL DEFAULT 'simple';
