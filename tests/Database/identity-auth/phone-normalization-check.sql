-- AutoService DB - phone numbers are stored in canonical E.164 with a European country code (ContactNormalization).
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. Every stored person phone (mechanic or customer) is +{country code}{national number} with a code from the
--    backend EuCountryCodes set. NULL is allowed (IX_people_PhoneNumber ignores it); an empty string is not.
SELECT 'people_phone_e164' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL people_phone_e164: ', COUNT(*), ' row(s), e.g. person ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text AS detail
    FROM people p
    WHERE p."PhoneNumber" IS NOT NULL
      AND NOT (
          p."PhoneNumber" ~ '^\+[1-9][0-9]{1,14}$'
          AND p."PhoneNumber" ~ '^\+(?:995|994|423|421|420|389|387|386|385|383|382|381|380|379|378|377|376|375|374|373|372|371|370|359|358|357|356|355|354|353|352|351|350|298|90|49|48|47|46|45|44|43|41|40|39|36|34|33|32|31|30|7)[0-9]{4,14}$'
      )
) v;
