-- AI policy: use ai_agent_test_user for AI-assisted checks and run SELECT queries only.
-- Never run INSERT/UPDATE/DELETE/TRUNCATE/ALTER/CREATE/DROP/GRANT/REVOKE via AI SQL tooling.

-- 1. REFRESH TOKEN SESSIONS — list with mechanic owner
--    Expected after fresh seed: 0 rows (until first login)
-- ------------------------------------------------------------
SELECT rt."Id",
       rt."MechanicId",
       p."Email" AS mechanic_email,
       rt."CreatedAtUtc",
       rt."ExpiresAtUtc",
       rt."RevokedAtUtc",
       rt."ReplacedByTokenHash",
       (rt."RevokedAtUtc" IS NULL AND rt."ExpiresAtUtc" > NOW()) AS is_active
FROM refreshtokens rt
JOIN people p ON p."Id" = rt."MechanicId"
ORDER BY rt."CreatedAtUtc" DESC;


-- ------------------------------------------------------------
-- 2. REFRESH TOKEN SUMMARY — active/revoked/expired counters
-- ------------------------------------------------------------
SELECT COUNT(*) AS total_tokens,
       COUNT(*) FILTER (WHERE rt."RevokedAtUtc" IS NULL AND rt."ExpiresAtUtc" > NOW()) AS active_tokens,
       COUNT(*) FILTER (WHERE rt."RevokedAtUtc" IS NOT NULL) AS revoked_tokens,
       COUNT(*) FILTER (WHERE rt."ExpiresAtUtc" <= NOW()) AS expired_tokens
FROM refreshtokens rt;


-- ------------------------------------------------------------
-- 3. REFRESH TOKEN ROTATION INTEGRITY
--    Every ReplacedByTokenHash (if set) should point to an existing token hash.
--    Expected: 0 rows.
-- ------------------------------------------------------------
SELECT old_rt."Id" AS old_token_id,
       old_rt."ReplacedByTokenHash"
FROM refreshtokens old_rt
LEFT JOIN refreshtokens new_rt ON new_rt."TokenHash" = old_rt."ReplacedByTokenHash"
WHERE old_rt."ReplacedByTokenHash" IS NOT NULL
  AND new_rt."Id" IS NULL;


-- ------------------------------------------------------------
-- 4. PERSON/IDENTITY EMAIL CONSISTENCY (mechanics)
--    Expected: 0 rows.
-- ------------------------------------------------------------
SELECT p."Id" AS mechanic_id,
       p."Email" AS person_email,
       u."Email" AS identity_email
FROM people p
JOIN "AspNetUsers" u ON u."Id" = p."IdentityUserId"
WHERE p."PersonType" = 'Mechanic'
  AND LOWER(TRIM(p."Email")) <> LOWER(TRIM(u."Email"));


-- ------------------------------------------------------------
-- 5. PHONE NORMALIZATION CHECK (mechanics)
--    Expected: 0 rows.
--    Canonical format:
--      - 361xxxxxxx (Budapest, 10 digits total)
--      - 36(20|21|30|31|50|70)xxxxxxx (mobile/nomadic, 11 digits)
--      - 36<approved 2-digit area>xxxxxx (geographic, 10 digits)
-- ------------------------------------------------------------
SELECT p."Id" AS mechanic_id,
       p."PhoneNumber"
FROM people p
WHERE p."PersonType" = 'Mechanic'
  AND p."PhoneNumber" IS NOT NULL
  AND NOT (
      p."PhoneNumber" ~ '^361[0-9]{7}$'
      OR p."PhoneNumber" ~ '^36(20|21|30|31|50|70)[0-9]{7}$'
      OR p."PhoneNumber" ~ '^36(22|23|24|25|26|27|28|29|32|33|34|35|36|37|42|44|45|46|47|48|49|52|53|54|56|57|59|62|63|66|68|69|72|73|74|75|76|77|78|79|82|83|84|85|87|88|89|92|93|94|95|96|99)[0-9]{6}$'
  );


-- ------------------------------------------------------------
-- 6. NORMALIZED PHONE DUPLICATE CHECK (identity users)
--    Expected: 0 rows.
-- ------------------------------------------------------------
WITH normalized_identity_phone AS (
    SELECT u."Id" AS user_id,
           u."PhoneNumber" AS raw_phone,
       regexp_replace(u."PhoneNumber", '\\D', '', 'g') AS digits_only
  FROM "AspNetUsers" u
),
country_normalized AS (
  SELECT user_id,
       raw_phone,
           CASE
         WHEN raw_phone IS NULL OR BTRIM(raw_phone) = '' THEN NULL
         WHEN digits_only LIKE '0036%' THEN SUBSTRING(digits_only FROM 3)
         WHEN digits_only LIKE '06%' THEN '36' || SUBSTRING(digits_only FROM 3)
         WHEN digits_only LIKE '36%' THEN digits_only
         ELSE NULL
       END AS candidate_e164
  FROM normalized_identity_phone
),
validated_identity_phone AS (
  SELECT user_id,
       raw_phone,
       CASE
         WHEN candidate_e164 IS NULL THEN NULL
         WHEN candidate_e164 ~ '^361[0-9]{7}$' THEN candidate_e164
         WHEN candidate_e164 ~ '^36(20|21|30|31|50|70)[0-9]{7}$' THEN candidate_e164
         WHEN candidate_e164 ~ '^36(22|23|24|25|26|27|28|29|32|33|34|35|36|37|42|44|45|46|47|48|49|52|53|54|56|57|59|62|63|66|68|69|72|73|74|75|76|77|78|79|82|83|84|85|87|88|89|92|93|94|95|96|99)[0-9]{6}$' THEN candidate_e164
               ELSE
           NULL
           END AS normalized_phone
  FROM country_normalized
)
SELECT normalized_phone,
       COUNT(*) AS duplicate_count,
       STRING_AGG(user_id, ', ') AS identity_user_ids,
       STRING_AGG(COALESCE(raw_phone, '<NULL>'), ', ') AS raw_values
FROM validated_identity_phone
WHERE normalized_phone IS NOT NULL
GROUP BY normalized_phone
HAVING COUNT(*) > 1
ORDER BY normalized_phone;


-- ------------------------------------------------------------
-- 7. IDENTITY ROLE CHECK — Admin role and assignment existence
--    Expected: at least one row for gabor.kovacs@example.com with role 'Admin'
-- ------------------------------------------------------------
SELECT u."Email" AS identity_email,
       r."Name" AS role_name
FROM "AspNetUsers" u
JOIN "AspNetUserRoles" ur ON ur."UserId" = u."Id"
JOIN "AspNetRoles" r ON r."Id" = ur."RoleId"
ORDER BY u."Email", r."Name";


-- ------------------------------------------------------------
-- 8. GABOR ADMIN ASSERTION — explicit check for seeded admin
--    Expected: 1
-- ------------------------------------------------------------
SELECT COUNT(*) AS gabor_admin_role_count
FROM "AspNetUsers" u
JOIN "AspNetUserRoles" ur ON ur."UserId" = u."Id"
JOIN "AspNetRoles" r ON r."Id" = ur."RoleId"
WHERE LOWER(TRIM(u."Email")) = 'gabor.kovacs@example.com'
  AND r."Name" = 'Admin';
