-- AutoService DB — Expired Token Cleanup Verification (SELECT-only; ai_agent_test_user).
--     ExpiredTokenCleanupService (hourly) deletes expired revokedjwttokens, and refreshtokens that are both expired and revoked.


-- 1. EXPIRED JWT DENYLIST ROWS — revokedjwttokens past its lifetime; next hourly cleanup tick removes them.
--    Expected in a well-maintained environment: low/near 0 shortly after a cleanup cycle.
SELECT COUNT(*) AS expired_jwt_denylist_rows
FROM revokedjwttokens
WHERE "ExpiresAtUtc" <= NOW();


-- 2. EXPIRED AND REVOKED REFRESH TOKENS — cleanup candidates; only rows matching BOTH conditions
--    are removed (expired-but-not-revoked rows stay). Expected after a cleanup cycle: 0.
SELECT COUNT(*) AS expired_revoked_refresh_token_rows
FROM refreshtokens
WHERE "ExpiresAtUtc" <= NOW()
  AND "RevokedAtUtc" IS NOT NULL;
