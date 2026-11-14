-- Presentation-only change for the pre-existing default edition.
-- Keeps IDs, prizes, prices, status, draw mechanics and authorizations untouched.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.draw_catalog
    WHERE id='principal'
      AND title NOT IN ('Sorteo iPhone 18', 'Edición iPhone 18')
  ) THEN
    RAISE EXCEPTION 'Principal edition title was customized; refusing to overwrite';
  END IF;
END $$;
UPDATE public.draw_catalog
SET title='Edición iPhone 18'
WHERE id='principal' AND title='Sorteo iPhone 18';
