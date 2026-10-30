-- AutoService DB - people rows (TPH): discriminator, customer/mechanic columns, names, e-mail, template markers.
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. The PersonType discriminator holds only the two concrete types; People itself stays abstract.
SELECT 'person_type_values' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL person_type_values: ', COUNT(*), ' row(s), e.g. person ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text || ' has type ' || p."PersonType" AS detail
    FROM people p
    WHERE p."PersonType" NOT IN ('Customer', 'Mechanic')
) v;


-- 2. Customers never get an account or the mechanic-only columns; the identity link lives on mechanics alone.
SELECT 'customer_has_no_account_columns' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL customer_has_no_account_columns: ', COUNT(*), ' row(s), e.g. customer ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text AS detail
    FROM people p
    WHERE p."PersonType" = 'Customer'
      AND (p."IdentityUserId" IS NOT NULL
           OR p."Specialization" IS NOT NULL
           OR p."Expertise" IS NOT NULL
           OR p."TokensValidAfter" IS NOT NULL
           OR p."ProfilePictureObjectKey" IS NOT NULL
           OR p."ProfilePictureETag" IS NOT NULL
           OR p."ProfilePictureContentType" IS NOT NULL)
) v;


-- 3. Names are stored trimmed and non-blank; a missing MiddleName is NULL, never an empty string.
SELECT 'names_trimmed_and_non_blank' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL names_trimmed_and_non_blank: ', COUNT(*), ' row(s), e.g. person ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text AS detail
    FROM people p
    WHERE btrim(p."FirstName") = ''
       OR p."FirstName" <> btrim(p."FirstName")
       OR btrim(p."LastName") = ''
       OR p."LastName" <> btrim(p."LastName")
       OR (p."MiddleName" IS NOT NULL AND (btrim(p."MiddleName") = '' OR p."MiddleName" <> btrim(p."MiddleName")))
) v;


-- 4. E-mail is stored normalized: trimmed, no upper-case ASCII letter, exactly one local part and one domain.
SELECT 'email_normalized' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL email_normalized: ', COUNT(*), ' row(s), e.g. person ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text AS detail
    FROM people p
    WHERE p."Email" <> btrim(p."Email")
       OR p."Email" ~ '[A-Z]'
       OR p."Email" !~ '^[^@[:space:]]+@[^@[:space:]]+$'
) v;


-- 5. No template placeholder marker (CHANGE_ME, SET_UNIQUE_LOCAL) leaked into e-mail, phone or names.
SELECT 'no_template_markers' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL no_template_markers: ', COUNT(*), ' row(s), e.g. person ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text AS detail
    FROM people p
    WHERE strpos(upper(concat_ws('|', p."Email", p."PhoneNumber", p."FirstName", p."MiddleName", p."LastName")), 'CHANGE_ME') > 0
       OR strpos(upper(concat_ws('|', p."Email", p."PhoneNumber", p."FirstName", p."MiddleName", p."LastName")), 'SET_UNIQUE_LOCAL') > 0
) v;

