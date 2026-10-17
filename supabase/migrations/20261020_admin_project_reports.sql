BEGIN;

-- Project reports are inserted by the server using service_role. Admins need
-- read access to review them, but public and ordinary authenticated users do not.
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_project_reports_created_at
  ON public.project_reports(created_at DESC);
REVOKE ALL ON public.project_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.project_reports TO authenticated;

DROP POLICY IF EXISTS "Admins can read project reports" ON public.project_reports;
CREATE POLICY "Admins can read project reports"
  ON public.project_reports FOR SELECT TO authenticated
  USING ((SELECT public.is_communitycraft_admin()));

-- Allow report status changes to appear in the existing append-only audit log.
ALTER TABLE public.moderation_events
  DROP CONSTRAINT IF EXISTS moderation_events_entity_type_check;
ALTER TABLE public.moderation_events
  ADD CONSTRAINT moderation_events_entity_type_check
  CHECK (entity_type IN ('project', 'contribution_request', 'project_report'));

CREATE OR REPLACE FUNCTION public.admin_update_project_report(
  p_report_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_state JSONB;
  new_state JSONB;
BEGIN
  IF NOT (SELECT public.is_communitycraft_admin()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('open', 'reviewed', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid report status' USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object('status', r.status, 'reviewed_at', r.reviewed_at)
    INTO old_state
    FROM public.project_reports r
    WHERE r.id = p_report_id
    FOR UPDATE;
  IF old_state IS NULL THEN
    RAISE EXCEPTION 'Project report not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.project_reports
  SET status = p_status,
      reviewed_at = CASE WHEN p_status = 'open' THEN NULL ELSE timezone('utc'::text, now()) END,
      reviewed_by = CASE WHEN p_status = 'open' THEN NULL ELSE (SELECT auth.uid())::text END
  WHERE id = p_report_id;

  SELECT jsonb_build_object('status', r.status, 'reviewed_at', r.reviewed_at)
    INTO new_state
    FROM public.project_reports r
    WHERE r.id = p_report_id;

  INSERT INTO public.moderation_events(actor_id, entity_type, entity_id, action, before_state, after_state)
  VALUES ((SELECT auth.uid()), 'project_report', p_report_id, 'project_report_status_changed', old_state, new_state);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_project_report(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_project_report(UUID, TEXT) TO authenticated;

COMMIT;
