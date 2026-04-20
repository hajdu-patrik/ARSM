-- AI policy: use ai_agent_test_user for AI-assisted checks and run SELECT queries only.
-- Never run INSERT/UPDATE/DELETE/TRUNCATE/ALTER/CREATE/DROP/GRANT/REVOKE via AI SQL tooling.

-- 9. JWT DENYLIST (revokedjwttokens) — active and expired entries
--    After logout, the current access token jti should appear here until it expires.
--    Expected after fresh seed with no prior logins: 0 rows.
-- ------------------------------------------------------------
SELECT rjt."Id",
       rjt."Jti",
       rjt."ExpiresAtUtc",
       rjt."RevokedAtUtc",
       (rjt."ExpiresAtUtc" > NOW()) AS is_still_within_token_lifetime
FROM revokedjwttokens rjt
ORDER BY rjt."RevokedAtUtc" DESC;


-- ------------------------------------------------------------
-- 10. JWT DENYLIST SUMMARY — count by expiry state
--     Use after a logout to confirm the denylisted token was recorded.
-- ------------------------------------------------------------
SELECT COUNT(*) AS total_denylisted,
       COUNT(*) FILTER (WHERE "ExpiresAtUtc" > NOW()) AS still_active_tokens,
       COUNT(*) FILTER (WHERE "ExpiresAtUtc" <= NOW()) AS expired_tokens
FROM revokedjwttokens;
