-- AutoService DB — Expired Token Cleanup Verification (SELECT-only; ai_agent_test_user).
--     ExpiredTokenCleanupService (hourly) deletes expired revokedjwttokens and every expired refreshtokens row, revoked or not.


-- 1. EXPIRED JWT DENYLIST ROWS — revokedjwttokens past its lifetime; next hourly cleanup tick removes them.
--    Expected in a well-maintained environment: low/near 0 shortly after a cleanup cycle.
SELECT COUNT(*) AS expired_jwt_denylist_rows
FROM revokedjwttokens
WHERE "ExpiresAtUtc" <= NOW();


-- 2. EXPIRED REFRESH TOKENS — every expired row is a cleanup candidate, revoked or not (a session that
--    simply ran out is removed too). Expected after a cleanup cycle: both counts 0.
SELECT COUNT(*) AS expired_refresh_token_rows,
       COUNT(*) FILTER (WHERE "RevokedAtUtc" IS NULL) AS expired_unrevoked_refresh_token_rows
FROM refreshtokens
WHERE "ExpiresAtUtc" <= NOW();
