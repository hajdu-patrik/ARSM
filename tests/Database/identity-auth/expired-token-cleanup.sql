-- ============================================================
-- AutoService DB — Expired Token Cleanup Verification
-- Verification-only: read-only SELECT queries. No DML/DDL.
-- AI policy: use ai_agent_test_user for AI-assisted checks and run SELECT queries only.
-- Never run INSERT/UPDATE/DELETE/TRUNCATE/ALTER/CREATE/DROP/GRANT/REVOKE via AI SQL tooling.
--
-- ExpiredTokenCleanupService runs hourly and removes:
--   - revokedjwttokens rows where ExpiresAtUtc <= NOW()
--   - refreshtokens rows where ExpiresAtUtc <= NOW() AND RevokedAtUtc IS NOT NULL
--
-- Use these queries to inspect pre-cleanup state, post-cleanup state,
-- or to verify the cleanup service is running correctly.
-- ============================================================


-- ------------------------------------------------------------
-- 1. EXPIRED JWT DENYLIST ROWS — candidates for next cleanup run
--    These are revokedjwttokens entries whose token lifetime has
--    passed; ExpiredTokenCleanupService will delete them on its
--    next hourly tick. Expected in a well-maintained environment:
--    low count (ideally 0 shortly after a cleanup cycle).
-- ------------------------------------------------------------
SELECT COUNT(*) AS expired_jwt_denylist_rows
FROM revokedjwttokens
WHERE "ExpiresAtUtc" <= NOW();


-- ------------------------------------------------------------
-- 2. EXPIRED AND REVOKED REFRESH TOKENS — cleanup candidates
--    Only rows matching BOTH conditions are removed by the service
--    (expired non-revoked tokens are left until they are also revoked).
--    Expected after a cleanup cycle: 0.
-- ------------------------------------------------------------
SELECT COUNT(*) AS expired_revoked_refresh_token_rows
FROM refreshtokens
WHERE "ExpiresAtUtc" <= NOW()
  AND "RevokedAtUtc" IS NOT NULL;


-- ------------------------------------------------------------
-- 3. ACTIVE REFRESH TOKEN SUMMARY — per mechanic
--    Non-expired, non-revoked tokens grouped by mechanic.
--    Expected after fresh seed: 0 rows (no sessions until first login).
-- ------------------------------------------------------------
SELECT p."Id"    AS mechanic_id,
       p."Email" AS mechanic_email,
       COUNT(*)  AS active_token_count
FROM refreshtokens rt
JOIN people p ON p."Id" = rt."MechanicId"
WHERE rt."ExpiresAtUtc" > NOW()
  AND rt."RevokedAtUtc" IS NULL
GROUP BY p."Id", p."Email"
ORDER BY active_token_count DESC, p."Email";


-- ------------------------------------------------------------
-- 4. JWT DENYLIST GROWTH CHECK — total row count
--    A steadily growing count between cleanup cycles indicates
--    active logout/revocation activity. A count that never drops
--    may mean the cleanup service is not running.
-- ------------------------------------------------------------
SELECT COUNT(*) AS total_jwt_denylist_rows
FROM revokedjwttokens;
