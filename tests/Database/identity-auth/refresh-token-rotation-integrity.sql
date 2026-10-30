-- AutoService DB - refresh token sessions: hashed values, lifetime order and rotation chains (AuthEndpoints.Refresh).
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. Only SHA-256 hex hashes are stored (never a raw cookie value), and a token never replaces itself.
SELECT 'refresh_token_hash_format' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL refresh_token_hash_format: ', COUNT(*), ' token(s), e.g. id ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT rt."Id"::text AS detail
    FROM refreshtokens rt
    WHERE rt."TokenHash" !~ '^[0-9A-F]{64}$'
       OR (rt."ReplacedByTokenHash" IS NOT NULL AND rt."ReplacedByTokenHash" !~ '^[0-9A-F]{64}$')
       OR rt."ReplacedByTokenHash" = rt."TokenHash"
) v;


-- 2. A session lives forward in time: it expires after it was created and is revoked no earlier than created.
SELECT 'refresh_token_lifetime_order' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL refresh_token_lifetime_order: ', COUNT(*), ' token(s), e.g. id ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT rt."Id"::text AS detail
    FROM refreshtokens rt
    WHERE rt."ExpiresAtUtc" <= rt."CreatedAtUtc"
       OR (rt."RevokedAtUtc" IS NOT NULL AND rt."RevokedAtUtc" < rt."CreatedAtUtc")
) v;


-- 3. Rotation: every ReplacedByTokenHash names an existing token of the same mechanic, and a replaced token
--    is always revoked (rotating revokes the old one in the same save).
SELECT 'refresh_token_rotation_chain' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL refresh_token_rotation_chain: ', COUNT(*), ' token(s), e.g. id ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT old_rt."Id"::text AS detail
    FROM refreshtokens old_rt
    LEFT JOIN refreshtokens new_rt ON new_rt."TokenHash" = old_rt."ReplacedByTokenHash"
    WHERE old_rt."ReplacedByTokenHash" IS NOT NULL
      AND (new_rt."Id" IS NULL
           OR new_rt."MechanicId" <> old_rt."MechanicId"
           OR old_rt."RevokedAtUtc" IS NULL)
) v;


-- 4. Only mechanics own sessions, and an owner is never a customer row (the FK targets the shared people table).
SELECT 'refresh_token_owner_is_mechanic' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL refresh_token_owner_is_mechanic: ', COUNT(*), ' token(s), e.g. id ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT rt."Id"::text AS detail
    FROM refreshtokens rt
    JOIN people p ON p."Id" = rt."MechanicId"
    WHERE p."PersonType" <> 'Mechanic'
) v;
