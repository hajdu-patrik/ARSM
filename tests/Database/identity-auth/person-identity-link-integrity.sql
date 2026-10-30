-- AutoService DB - the People.IdentityUserId link between mechanics and ASP.NET Identity accounts.
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. Every mechanic points at an existing Identity account (a customer never does, see people-data-integrity.sql).
SELECT 'mechanic_has_identity_account' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL mechanic_has_identity_account: ', COUNT(*), ' mechanic(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text AS detail
    FROM people p
    LEFT JOIN "AspNetUsers" u ON u."Id" = p."IdentityUserId"
    WHERE p."PersonType" = 'Mechanic'
      AND u."Id" IS NULL
) v;


-- 2. Every Identity account belongs to exactly one mechanic (registration and the admin bootstrap create both in
--    one transaction; deletes remove both), so no orphaned login can exist.
SELECT 'identity_account_has_mechanic' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL identity_account_has_mechanic: ', COUNT(*), ' account(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT u."Id" AS detail
    FROM "AspNetUsers" u
    LEFT JOIN people p ON p."IdentityUserId" = u."Id" AND p."PersonType" = 'Mechanic'
    GROUP BY u."Id"
    HAVING COUNT(p."Id") <> 1
) v;


-- 3. The account mirrors the person: UserName and Email equal people.Email (profile edits update both).
SELECT 'identity_credentials_mirror_person' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL identity_credentials_mirror_person: ', COUNT(*), ' mechanic(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT p."Id"::text AS detail
    FROM people p
    JOIN "AspNetUsers" u ON u."Id" = p."IdentityUserId"
    WHERE p."PersonType" = 'Mechanic'
      AND (u."Email" IS DISTINCT FROM p."Email"
           OR u."UserName" IS DISTINCT FROM p."Email")
) v;


-- 4. The normalized lookup columns are the upper-cased e-mail (login resolves accounts through them).
--    Checked for printable-ASCII addresses, where upper() and ToUpperInvariant agree.
SELECT 'identity_normalized_columns' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL identity_normalized_columns: ', COUNT(*), ' account(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT u."Id" AS detail
    FROM "AspNetUsers" u
    WHERE u."Email" ~ '^[ -~]+$'
      AND (u."NormalizedEmail" IS DISTINCT FROM upper(u."Email")
           OR u."NormalizedUserName" IS DISTINCT FROM upper(u."Email"))
) v;
