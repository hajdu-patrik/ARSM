-- ============================================================
-- AutoService DB — Validation Queries
-- Run these inside psql after seeding demo data.
-- Usage: docker exec -it <CONTAINER_NAME> sh
--        export PGPASSWORD=$POSTGRES_PASSWORD
--        psql -U postgres -d AutoServiceDb
--------------------------OR-----------------------------------
-- Download "SQLTools" extension for VS Code, add a new PostgreSQL connection with the same credentials,
-- and run this file directly in the editor.
-- ============================================================


-- ------------------------------------------------------------
-- 1. ROW COUNTS — quick seed sanity check
--    Expected after fresh seed:
--      people=8, vehicles=5, appointments=5,
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
SELECT * FROM people ORDER BY "Id";


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
       v."Brand",
       v."Model",
       v."Year",
       v."MileageKm",
       v."EnginePowerHp",
       v."EngineTorqueNm",
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


-- ------------------------------------------------------------
-- 9. APPOINTMENT–MECHANIC JOIN — who is assigned to what
-- ------------------------------------------------------------
SELECT a."Id"           AS appt_id,
       a."ScheduledDate",
       a."Status",
       m."FirstName" || ' ' || m."LastName" AS mechanic,
       m."Specialization"
FROM appointments a
JOIN appointmentmechanics am ON am."AppointmentId" = a."Id"
JOIN people               m  ON m."Id"             = am."MechanicId"
ORDER BY a."Id", m."LastName";


-- ------------------------------------------------------------
-- 10. FULL OVERVIEW — customer + car + appointment + mechanic
-- ------------------------------------------------------------
SELECT a."Id"             AS appt_id,
       a."ScheduledDate",
       a."Status",
       v."LicensePlate",
       v."Brand" || ' ' || v."Model"              AS car,
       cust."FirstName" || ' ' || cust."LastName" AS customer,
       mech."FirstName" || ' ' || mech."LastName" AS mechanic
FROM appointments a
JOIN vehicles   v    ON v."Id"              = a."VehicleId"
JOIN people     cust ON cust."Id"           = v."CustomerId"
JOIN appointmentmechanics am ON am."AppointmentId" = a."Id"
JOIN people     mech ON mech."Id"           = am."MechanicId"
ORDER BY a."ScheduledDate", mech."LastName";


-- ------------------------------------------------------------
-- 11. FILTER — appointments by status
--     Valid values: 'InProgress', 'Completed', 'Cancelled'
--     ('Scheduled' is no longer a valid status.)
-- ------------------------------------------------------------
SELECT a."Id", a."ScheduledDate", a."TaskDescription",
       v."LicensePlate", v."Brand" || ' ' || v."Model" AS car
FROM appointments a
JOIN vehicles v ON v."Id" = a."VehicleId"
WHERE a."Status" = 'InProgress'
ORDER BY a."ScheduledDate";


-- ------------------------------------------------------------
-- 12. APPLIED MIGRATIONS
-- ------------------------------------------------------------
SELECT "MigrationId", "ProductVersion"
FROM "__EFMigrationsHistory"
ORDER BY "MigrationId";


-- ------------------------------------------------------------
-- 13. COLUMN-LEVEL SCHEMA — all public tables
-- ------------------------------------------------------------
SELECT table_name,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
