-- Allow anonymous red-flag submissions: authenticated member of the cycle's org may
-- insert with submitted_by_user_id NULL (identity not persisted) while still
-- enforcing org membership via RLS.
DROP POLICY IF EXISTS "external_red_flag_forms_insert_anonymous_member"
  ON public.external_red_flag_forms;

CREATE POLICY "external_red_flag_forms_insert_anonymous_member"
  ON public.external_red_flag_forms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by_user_id IS NULL
    AND is_anonymous_to_owner IS TRUE
    AND EXISTS (
      SELECT 1
      FROM public.recruitment_cycles rc
      WHERE rc.id = recruitment_cycle_id
        AND rc.organization_id = organization_id
        AND (
          EXISTS (
            SELECT 1
            FROM public.organizations o
            WHERE o.id = rc.organization_id
              AND o.owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.organization_id = rc.organization_id
              AND ou.user_id = auth.uid()
          )
        )
    )
  );
