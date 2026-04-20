-- 6. NORMALIZED PHONE DUPLICATE CHECK (identity users)
--    Expected: 0 rows.
--    Accepts both canonical +E.164 and legacy no-plus values for detection.
-- ------------------------------------------------------------
WITH normalized_identity_phone AS (
    SELECT u."Id" AS user_id,
           u."PhoneNumber" AS raw_phone,
           regexp_replace(COALESCE(u."PhoneNumber", ''), '\\D', '', 'g') AS digits_only
  FROM "AspNetUsers" u
),
canonicalized AS (
  SELECT user_id,
       raw_phone,
           CASE
             WHEN raw_phone IS NULL OR BTRIM(raw_phone) = '' THEN NULL
             WHEN raw_phone ~ '^\+[1-9][0-9]{1,14}$' THEN raw_phone
             WHEN raw_phone ~ '^[1-9][0-9]{1,14}$' THEN '+' || raw_phone
             ELSE NULL
       END AS candidate_e164
  FROM normalized_identity_phone
),
validated_identity_phone AS (
  SELECT user_id,
       raw_phone,
       CASE
           WHEN candidate_e164 IS NULL THEN NULL
           WHEN candidate_e164 ~ '^\+[1-9][0-9]{1,14}$'
                AND candidate_e164 ~ '^\+(?:995|994|423|421|420|389|387|386|385|383|382|381|380|379|378|377|376|375|374|373|372|371|370|359|358|357|356|355|354|353|352|351|350|298|90|49|48|47|46|45|44|43|41|40|39|36|34|33|32|31|30|7)[0-9]{4,14}$'
           THEN candidate_e164
           ELSE NULL
           END AS normalized_phone
  FROM canonicalized
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
