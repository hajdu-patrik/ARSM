-- AutoService DB - mechanic rows: specialization, expertise list, password-reset flag, session cutoff, picture.
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. Specialization is one of the SpecializationType names (HasConversion<string> stores the name).
SELECT 'mechanic_specialization_values' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL mechanic_specialization_values: ', COUNT(*), ' row(s), e.g. mechanic ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text AS detail
    FROM people p
    WHERE p."PersonType" = 'Mechanic'
      AND (p."Specialization" IS NULL
           OR p."Specialization" NOT IN ('GasolineAndDiesel', 'HybridAndElectric', 'All'))
) v;


-- 2. Expertise is a comma-joined list of 1..10 distinct ExpertiseType names (CK_Mechanics_Expertise_NotEmpty is
--    only the floor; the 1..10 and uniqueness rules are enforced in AutoServiceDbContext.ValidateMechanicExpertise).
WITH tokens AS (
    SELECT p."Id" AS mechanic_id, t.tok
    FROM people p
    CROSS JOIN LATERAL unnest(string_to_array(COALESCE(p."Expertise", ''), ',')) AS t (tok)
    WHERE p."PersonType" = 'Mechanic'
),
violations AS (
    SELECT p."Id"::text || ' has no expertise' AS detail
    FROM people p
    WHERE p."PersonType" = 'Mechanic'
      AND btrim(COALESCE(p."Expertise", '')) = ''
    UNION ALL
    SELECT mechanic_id::text || ' has token "' || tok || '"'
    FROM tokens
    WHERE tok NOT IN ('Engine', 'Transmission', 'Brakes', 'Suspension', 'ElectricalSystem',
                      'AirConditioning', 'ExhaustSystem', 'FuelSystem', 'CoolingSystem', 'Bodywork')
    UNION ALL
    SELECT mechanic_id::text || ' has ' || COUNT(*) || ' token(s), ' || COUNT(DISTINCT tok) || ' distinct'
    FROM tokens
    GROUP BY mechanic_id
    HAVING COUNT(*) NOT BETWEEN 1 AND 10
        OR COUNT(*) <> COUNT(DISTINCT tok)
)
SELECT 'mechanic_expertise_list' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL mechanic_expertise_list: ', COUNT(*), ' problem(s), e.g. mechanic ', MIN(v.detail))::int::text END AS check_result
FROM violations v;


-- 3. MustChangePassword is never NULL on a mechanic (the migration default is false, the admin reset sets true).
SELECT 'mechanic_must_change_password_set' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL mechanic_must_change_password_set: ', COUNT(*), ' row(s), e.g. mechanic ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text AS detail
    FROM people p
    WHERE p."PersonType" = 'Mechanic'
      AND p."MustChangePassword" IS NULL
) v;


-- 4. The persisted session cutoff is a whole second, like the iat claim it is compared with.
SELECT 'mechanic_tokens_valid_after_whole_second' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL mechanic_tokens_valid_after_whole_second: ', COUNT(*), ' row(s), e.g. mechanic ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text AS detail
    FROM people p
    WHERE p."TokensValidAfter" IS NOT NULL
      AND p."TokensValidAfter" <> date_trunc('second', p."TokensValidAfter")
) v;


-- 5. The three profile-picture columns are set and cleared together, and a stored picture is always WebP.
SELECT 'mechanic_profile_picture_columns' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL mechanic_profile_picture_columns: ', COUNT(*), ' row(s), e.g. mechanic ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text AS detail
    FROM people p
    WHERE (p."ProfilePictureObjectKey" IS NULL) <> (p."ProfilePictureETag" IS NULL)
       OR (p."ProfilePictureObjectKey" IS NULL) <> (p."ProfilePictureContentType" IS NULL)
       OR (p."ProfilePictureObjectKey" IS NOT NULL AND p."ProfilePictureContentType" <> 'image/webp')
       OR (p."ProfilePictureObjectKey" IS NOT NULL AND btrim(p."ProfilePictureObjectKey") = '')
) v;
