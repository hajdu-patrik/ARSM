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
