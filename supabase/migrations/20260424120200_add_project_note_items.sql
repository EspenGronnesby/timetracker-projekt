-- project_note_items: separate, titulerte notater per prosjekt
-- (handleliste, kutt-dimensjoner, planlegging, osv).
-- Hovednotat-feltet (projects.notes) beholdes for raskt skriblering.

CREATE TABLE IF NOT EXISTS public.project_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_note_items_project_id_idx
  ON public.project_note_items (project_id);

-- Auto-oppdater updated_at ved UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_note_items_updated_at ON public.project_note_items;
CREATE TRIGGER project_note_items_updated_at
  BEFORE UPDATE ON public.project_note_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.project_note_items ENABLE ROW LEVEL SECURITY;

-- Rydd gamle policies (idempotent)
DROP POLICY IF EXISTS "Members can view project note items" ON public.project_note_items;
DROP POLICY IF EXISTS "Members can insert project note items" ON public.project_note_items;
DROP POLICY IF EXISTS "Members can update own project note items" ON public.project_note_items;
DROP POLICY IF EXISTS "Members can delete own project note items" ON public.project_note_items;

-- SELECT: alle prosjektmedlemmer kan lese
CREATE POLICY "Members can view project note items"
  ON public.project_note_items FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

-- INSERT: må være medlem av prosjektet og eier av user_id
CREATE POLICY "Members can insert project note items"
  ON public.project_note_items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_project_member(auth.uid(), project_id)
  );

-- UPDATE: egen notat, eller prosjekt-eier/admin
CREATE POLICY "Members can update own project note items"
  ON public.project_note_items FOR UPDATE
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_note_items.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
    )
  );

-- DELETE: egen notat, eller prosjekt-eier/admin
CREATE POLICY "Members can delete own project note items"
  ON public.project_note_items FOR DELETE
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_note_items.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_note_items TO authenticated;
