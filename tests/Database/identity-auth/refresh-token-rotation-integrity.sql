-- 3. REFRESH TOKEN ROTATION INTEGRITY — every ReplacedByTokenHash (if set) must point to an existing hash.
--    Expected: 0 rows.
SELECT old_rt."Id" AS old_token_id,
       old_rt."ReplacedByTokenHash"
FROM refreshtokens old_rt
LEFT JOIN refreshtokens new_rt ON new_rt."TokenHash" = old_rt."ReplacedByTokenHash"
WHERE old_rt."ReplacedByTokenHash" IS NOT NULL
  AND new_rt."Id" IS NULL;
