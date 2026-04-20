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
