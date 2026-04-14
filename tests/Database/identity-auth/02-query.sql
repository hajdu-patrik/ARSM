-- 2. REFRESH TOKEN SUMMARY — active/revoked/expired counters
-- ------------------------------------------------------------
SELECT COUNT(*) AS total_tokens,
       COUNT(*) FILTER (WHERE rt."RevokedAtUtc" IS NULL AND rt."ExpiresAtUtc" > NOW()) AS active_tokens,
       COUNT(*) FILTER (WHERE rt."RevokedAtUtc" IS NOT NULL) AS revoked_tokens,
       COUNT(*) FILTER (WHERE rt."ExpiresAtUtc" <= NOW()) AS expired_tokens
FROM refreshtokens rt;
