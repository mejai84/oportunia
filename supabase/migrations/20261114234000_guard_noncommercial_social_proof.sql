-- Oportunia noncommercial safety gate (2026-11-14)
-- Prevent unauthenticated/unaudited published social proof before there is
-- independently verifiable commercial participation and official result evidence.
-- This migration is intentionally conservative and reversible with the statements
-- at the bottom of this file; do not remove guards until proper trusted verification
-- and legally authorized activity are available.

CREATE OR REPLACE FUNCTION public.guard_noncommercial_social_proof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
BEGIN
  IF TG_TABLE_NAME = 'draw_reviews' THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Las opiniones de participantes están cerradas hasta comprobar participaciones reales';
    END IF;
    IF NEW.status = 'published' THEN
      RAISE EXCEPTION 'No se pueden publicar reseñas sin verificar la participación';
    END IF;
    IF TG_OP = 'UPDATE' AND NOT public.staff_has_permission('reviews.write') THEN
      IF OLD.status IS DISTINCT FROM 'pending'
        OR NEW.id IS DISTINCT FROM OLD.id
        OR NEW.draw_id IS DISTINCT FROM OLD.draw_id
        OR NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
        OR NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Solo se puede editar el texto de una opinión pendiente';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'draw_results' THEN
    IF NEW.verified_at IS NOT NULL THEN
      RAISE EXCEPTION 'La publicación de resultados requiere verificación independiente y autorización';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_noncommercial_draw_reviews ON public.draw_reviews;
CREATE TRIGGER enforce_noncommercial_draw_reviews
 BEFORE INSERT OR UPDATE ON public.draw_reviews
 FOR EACH ROW EXECUTE FUNCTION public.guard_noncommercial_social_proof();

DROP TRIGGER IF EXISTS enforce_noncommercial_draw_results ON public.draw_results;
CREATE TRIGGER enforce_noncommercial_draw_results
 BEFORE INSERT OR UPDATE ON public.draw_results
 FOR EACH ROW EXECUTE FUNCTION public.guard_noncommercial_social_proof();

-- No user can author a public testimonial in preview mode, regardless of role.
DROP POLICY IF EXISTS "authenticated submits own reviews" ON public.draw_reviews;
DROP POLICY IF EXISTS "customers revise their own reviews for moderation" ON public.draw_reviews;

-- Targeted indexes for centralized reservation and bank-reference lookups.
CREATE INDEX IF NOT EXISTS idx_preview_reservation_draw_status_expiry
  ON public.preview_reservations(draw_id,status,expires_at);
CREATE INDEX IF NOT EXISTS idx_preview_reservation_user_created
  ON public.preview_reservations(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_preview_reserved_reservation
  ON public.preview_reserved_numbers(reservation_id);
CREATE INDEX IF NOT EXISTS idx_preview_events_reservation
  ON public.preview_reservation_events(reservation_id);
CREATE INDEX IF NOT EXISTS idx_bank_claim_customer_created
  ON public.bank_recon_claims(customer_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_claim_events_claim
  ON public.bank_recon_claim_events(claim_id);
CREATE INDEX IF NOT EXISTS idx_payment_case_reservation
  ON public.payment_control_cases(reservation_id);

COMMENT ON FUNCTION public.guard_noncommercial_social_proof() IS
'Fails closed on publication of unverified commercial opinions/results during noncommercial preview. Replace only after authorization and trusted verification have shipped.';

-- ROLLBACK (manual, controlled; restores the former policies only after review):
-- DROP TRIGGER IF EXISTS enforce_noncommercial_draw_reviews ON public.draw_reviews;
-- DROP TRIGGER IF EXISTS enforce_noncommercial_draw_results ON public.draw_results;
-- DROP FUNCTION IF EXISTS public.guard_noncommercial_social_proof();
-- CREATE POLICY "authenticated submits own reviews" ON public.draw_reviews FOR INSERT
--   TO authenticated WITH CHECK (user_id = (select auth.uid()) AND status='pending');
-- CREATE POLICY "customers revise their own reviews for moderation" ON public.draw_reviews
--   FOR UPDATE TO authenticated USING (user_id = (select auth.uid()))
--   WITH CHECK (user_id = (select auth.uid()) AND status='pending');
