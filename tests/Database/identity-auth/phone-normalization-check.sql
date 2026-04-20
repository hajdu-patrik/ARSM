-- 5. PHONE NORMALIZATION CHECK (mechanics)
--    Expected: 0 rows.
--    Canonical format: E.164 (+{countryCode}{nationalNumber})
--    Allowed country codes: European set aligned with backend ContactNormalization.
-- ------------------------------------------------------------
SELECT p."Id" AS mechanic_id,
       p."PhoneNumber"
FROM people p
WHERE p."PersonType" = 'Mechanic'
  AND p."PhoneNumber" IS NOT NULL
  AND NOT (
      p."PhoneNumber" ~ '^\+[1-9][0-9]{1,14}$'
      AND p."PhoneNumber" ~ '^\+(?:995|994|423|421|420|389|387|386|385|383|382|381|380|379|378|377|376|375|374|373|372|371|370|359|358|357|356|355|354|353|352|351|350|298|90|49|48|47|46|45|44|43|41|40|39|36|34|33|32|31|30|7)[0-9]{4,14}$'
  );
