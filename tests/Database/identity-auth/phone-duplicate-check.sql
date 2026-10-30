-- AutoService DB - Identity account phone numbers (AspNetUsers.PhoneNumber mirrors people.PhoneNumber).
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. No two Identity accounts share a phone number, and a set phone is canonical E.164 (+, 7..15 digits).
--    AspNetUsers has no unique index on it, so this is the only guard on the Identity side.
SELECT 'identity_phone_unique_and_canonical' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL identity_phone_unique_and_canonical: ', COUNT(*), ' problem(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT u."PhoneNumber" || ' shared by ' || COUNT(*) || ' accounts' AS detail
    FROM "AspNetUsers" u
    WHERE u."PhoneNumber" IS NOT NULL
    GROUP BY u."PhoneNumber"
    HAVING COUNT(*) > 1

    UNION ALL

    SELECT u."Id" || ' has a non-canonical phone'
    FROM "AspNetUsers" u
    WHERE u."PhoneNumber" IS NOT NULL
      AND u."PhoneNumber" !~ '^\+[1-9][0-9]{6,14}$'
) v;
