-- ============================================================
-- AutoService DB — Validation Queries
-- Run these inside psql after seeding demo data.
-- Usage: connect with the dedicated read-only ai_agent_test_user account,
--        then run this file against AutoServiceDb.
--------------------------OR-----------------------------------
-- Download "SQLTools" extension for VS Code, add a PostgreSQL connection for ai_agent_test_user,
-- and run this file directly in the editor.
-- AI policy: use ai_agent_test_user for AI-assisted checks and run SELECT queries only.
-- Never run INSERT/UPDATE/DELETE/TRUNCATE/ALTER/CREATE/DROP/GRANT/REVOKE via AI SQL tooling.
-- ============================================================


-- ------------------------------------------------------------
-- 1. ROW COUNTS — quick seed sanity check
--    Expected after fresh seed:
--      people=8, vehicles=5, appointments>=35,
--      AspNetUsers=3, AspNetRoles=1, AspNetUserRoles=1, refreshtokens=0
-- ------------------------------------------------------------
SELECT 'people' AS tbl, COUNT(*) AS cnt FROM people
UNION ALL
SELECT 'vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'appointmentmechanics', COUNT(*) FROM appointmentmechanics
UNION ALL
SELECT 'AspNetUsers (Identity)', COUNT(*) FROM "AspNetUsers"
UNION ALL
SELECT 'AspNetRoles (Identity)', COUNT(*) FROM "AspNetRoles"
UNION ALL
SELECT 'AspNetUserRoles (Identity)', COUNT(*) FROM "AspNetUserRoles"
UNION ALL
SELECT 'refreshtokens', COUNT(*) FROM refreshtokens;


-- ------------------------------------------------------------
-- 2. PEOPLE — all rows, raw
-- ------------------------------------------------------------
SELECT
  "Id",
  "FirstName",
  "MiddleName",
  "LastName",
  "Email",
  "PhoneNumber",
  "PersonType",
  "IdentityUserId",
  "Specialization",
  "Expertise"
FROM people
ORDER BY "Id";


-- ------------------------------------------------------------
-- 3. MECHANICS — with specialization and expertise
-- ------------------------------------------------------------
SELECT "Id", "FirstName", "LastName", "Email", "PhoneNumber",
       "Specialization", "Expertise"
FROM people
WHERE "PersonType" = 'Mechanic'
ORDER BY "Id";


-- ------------------------------------------------------------
-- 4. CUSTOMERS — passive records, no IdentityUserId
-- ------------------------------------------------------------
SELECT "Id", "FirstName", "LastName", "Email", "PhoneNumber",
       "IdentityUserId"
FROM people
WHERE "PersonType" = 'Customer'
ORDER BY "Id";


-- ------------------------------------------------------------
-- 5. IDENTITY ACCOUNTS — mechanics only
--    Every mechanic must have a matching row in AspNetUsers.
-- ------------------------------------------------------------
SELECT p."Id"   AS person_id,
       p."FirstName" || ' ' || p."LastName" AS full_name,
       p."Email" AS domain_email,
       u."Email" AS identity_email,
       u."Id"    AS identity_user_id
FROM people p
JOIN "AspNetUsers" u ON u."Id" = p."IdentityUserId"
WHERE p."PersonType" = 'Mechanic'
ORDER BY p."Id";


-- ------------------------------------------------------------
-- 6. IDENTITY INTEGRITY — customers must have NULL IdentityUserId
--    Expected: 5
-- ------------------------------------------------------------
SELECT COUNT(*) AS customers_without_account
FROM people
WHERE "PersonType" = 'Customer'
  AND "IdentityUserId" IS NULL;


-- ------------------------------------------------------------
-- 7. VEHICLES — with owner name
-- ------------------------------------------------------------
SELECT v."Id",
       v."LicensePlate",
  v."Vin",
       v."Brand",
       v."Model",
       v."Year",
       v."MileageKm",
  v."EnginePowerKw",
  v."DrivetrainType",
       p."FirstName" || ' ' || p."LastName" AS owner
FROM vehicles v
JOIN people p ON p."Id" = v."CustomerId"
ORDER BY v."Id";


-- ------------------------------------------------------------
-- 8. APPOINTMENTS — with vehicle and customer
--    Includes intake and due timestamps.
-- ------------------------------------------------------------
SELECT a."Id"           AS appt_id,
       a."ScheduledDate",
  a."IntakeCreatedAt",
  a."DueDateTime",
       a."Status",
       a."TaskDescription",
       v."LicensePlate",
       v."Brand" || ' ' || v."Model"       AS car,
       p."FirstName" || ' ' || p."LastName" AS customer
FROM appointments a
JOIN vehicles v ON v."Id" = a."VehicleId"
JOIN people   p ON p."Id" = v."CustomerId"
ORDER BY a."ScheduledDate";

-- Remaining sections were split to keep this suite chunked and maintainable:
-- - core-schema-appointments.sql
-- - core-schema-contracts.sql
