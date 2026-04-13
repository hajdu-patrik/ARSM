-- AI policy: use ai_agent_test_user for AI-assisted checks and run SELECT queries only.
-- Never run INSERT/UPDATE/DELETE/TRUNCATE/ALTER/CREATE/DROP/GRANT/REVOKE via AI SQL tooling.

-- 1. APPOINTMENT CLAIMS VERIFICATION
--    Shows which mechanic is assigned to which appointment.
--    Note: claim timestamp is not persisted; use ScheduledDate + inspected_at_utc.
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."ScheduledDate" AS scheduled_at_utc,
       am."MechanicId" AS claimed_by_mechanic_id,
       m."FirstName" || ' ' || m."LastName" AS claimed_by_mechanic_name,
       m."Email" AS claimed_by_mechanic_email,
       (NOW() AT TIME ZONE 'UTC') AS inspected_at_utc
FROM appointments a
LEFT JOIN appointmentmechanics am ON am."AppointmentId" = a."Id"
LEFT JOIN people m ON m."Id" = am."MechanicId"
ORDER BY a."Id", am."MechanicId";


-- ------------------------------------------------------------
-- 2. PROFILE UPDATE AUDIT (mechanics)
--    Verifies profile fields changed by /api/profile endpoints.
--    Includes firstName and lastName (updatable via PUT /api/profile).
-- ------------------------------------------------------------
SELECT "Id" AS mechanic_id,
       "Email",
       "PhoneNumber",
       "FirstName",
       "MiddleName",
       "LastName",
       ("ProfilePicture" IS NOT NULL) AS has_profile_picture
FROM people
WHERE "PersonType" = 'Mechanic'
ORDER BY "Id";


-- ------------------------------------------------------------
-- 3. APPOINTMENT STATUS TIMESTAMP AUDIT
--    Verifies completedAt / canceledAt are set correctly after status updates.
--    Valid statuses: InProgress, Completed, Cancelled. "Scheduled" is no longer valid.
--    Expected invariants:
--      Completed  -> CompletedAt IS NOT NULL, CanceledAt IS NULL
--      Cancelled  -> CanceledAt IS NOT NULL,  CompletedAt IS NULL
--      InProgress -> both IS NULL
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."Status",
       a."CompletedAt",
       a."CanceledAt",
       CASE
           WHEN a."Status" = 'Completed'  AND a."CompletedAt" IS NULL THEN 'FAIL: missing CompletedAt'
           WHEN a."Status" = 'Completed'  AND a."CanceledAt"  IS NOT NULL THEN 'FAIL: spurious CanceledAt'
           WHEN a."Status" = 'Cancelled'  AND a."CanceledAt"  IS NULL THEN 'FAIL: missing CanceledAt'
           WHEN a."Status" = 'Cancelled'  AND a."CompletedAt" IS NOT NULL THEN 'FAIL: spurious CompletedAt'
           WHEN a."Status" = 'InProgress' AND (a."CompletedAt" IS NOT NULL OR a."CanceledAt" IS NOT NULL) THEN 'FAIL: unexpected timestamp'
           ELSE 'OK'
       END AS timestamp_integrity
FROM appointments a
ORDER BY a."Id";


-- ------------------------------------------------------------
-- 4. APPOINTMENT ASSIGNMENT INVARIANT (NO ZERO-MECHANIC APPOINTMENTS)
--    Verifies no appointment exists without at least one assigned mechanic.
--    Expected: 0 rows.
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."ScheduledDate",
       a."Status",
       a."TaskDescription"
FROM appointments a
LEFT JOIN appointmentmechanics am ON am."AppointmentId" = a."Id"
GROUP BY a."Id", a."ScheduledDate", a."Status", a."TaskDescription"
HAVING COUNT(am."MechanicId") = 0
ORDER BY a."Id";


-- ------------------------------------------------------------
-- 5. PROFILE PICTURE STORAGE CHECK
--    Counts mechanics with and without stored profile pictures.
-- ------------------------------------------------------------
SELECT COUNT(*) FILTER (WHERE "ProfilePicture" IS NOT NULL) AS mechanics_with_profile_picture,
       COUNT(*) FILTER (WHERE "ProfilePicture" IS NULL) AS mechanics_without_profile_picture,
       COUNT(*) AS total_mechanics
FROM people
WHERE "PersonType" = 'Mechanic';


-- ------------------------------------------------------------
-- 6. REFRESH TOKEN SESSION ROTATION CHAIN
--    Shows TokenHash -> ReplacedByTokenHash links and broken chain flags.
-- ------------------------------------------------------------
SELECT rt."Id" AS token_id,
       rt."MechanicId",
       rt."TokenHash",
       rt."ReplacedByTokenHash",
       next_rt."Id" AS replacement_token_id,
       rt."CreatedAtUtc",
       rt."RevokedAtUtc",
       rt."ExpiresAtUtc",
       CASE
           WHEN rt."ReplacedByTokenHash" IS NULL THEN FALSE
           WHEN next_rt."Id" IS NULL THEN TRUE
           ELSE FALSE
       END AS has_broken_rotation_link
FROM refreshtokens rt
LEFT JOIN refreshtokens next_rt ON next_rt."TokenHash" = rt."ReplacedByTokenHash"
ORDER BY rt."MechanicId", rt."CreatedAtUtc";


-- ------------------------------------------------------------
-- 7. MECHANIC DELETION INTEGRITY
--    Verifies there are no orphaned rows after mechanic deletion.
--    Expected: 0 rows.
-- ------------------------------------------------------------
SELECT 'appointmentmechanics' AS source_table,
       am."MechanicId"::text AS dangling_reference
FROM appointmentmechanics am
LEFT JOIN people p ON p."Id" = am."MechanicId" AND p."PersonType" = 'Mechanic'
WHERE p."Id" IS NULL

UNION ALL

SELECT 'refreshtokens' AS source_table,
       rt."MechanicId"::text AS dangling_reference
FROM refreshtokens rt
LEFT JOIN people p ON p."Id" = rt."MechanicId" AND p."PersonType" = 'Mechanic'
WHERE p."Id" IS NULL

UNION ALL

SELECT 'AspNetUsers' AS source_table,
       u."Id" AS dangling_reference
FROM "AspNetUsers" u
LEFT JOIN people p ON p."IdentityUserId" = u."Id" AND p."PersonType" = 'Mechanic'
WHERE p."Id" IS NULL;


-- ------------------------------------------------------------
-- 8. ADMIN MECHANIC LIST CONSISTENCY
--    Cross-checks mechanics against Identity admin role membership and picture flag projection.
-- ------------------------------------------------------------
SELECT p."Id" AS mechanic_id,
       p."Email" AS mechanic_email,
       p."IdentityUserId" AS identity_user_id,
    ((p."ProfilePicture" IS NOT NULL) AND (p."ProfilePictureContentType" IS NOT NULL)) AS "HasProfilePicture",
       COALESCE(BOOL_OR(r."Name" = 'Admin'), FALSE) AS "IsAdmin"
FROM people p
LEFT JOIN "AspNetUsers" u ON u."Id" = p."IdentityUserId"
LEFT JOIN "AspNetUserRoles" ur ON ur."UserId" = u."Id"
LEFT JOIN "AspNetRoles" r ON r."Id" = ur."RoleId"
WHERE p."PersonType" = 'Mechanic'
GROUP BY p."Id", p."Email", p."IdentityUserId"
ORDER BY p."Id";


-- ------------------------------------------------------------
-- 9. CUSTOMER RECORD AUDIT
--    Lists all customer records with vehicle counts.
--    Use after POST/PUT/DELETE /api/customers to verify persistence.
-- ------------------------------------------------------------
SELECT c."Id" AS customer_id,
       c."FirstName",
       c."MiddleName",
       c."LastName",
       c."Email",
       c."PhoneNumber",
       COUNT(v."Id") AS vehicle_count
FROM people c
LEFT JOIN vehicles v ON v."CustomerId" = c."Id"
WHERE c."PersonType" = 'Customer'
GROUP BY c."Id", c."FirstName", c."MiddleName", c."LastName", c."Email", c."PhoneNumber"
ORDER BY c."Id";


-- ------------------------------------------------------------
-- 10. VEHICLE RECORD AUDIT
--     Lists all vehicles with their owning customer.
--     Use after POST/PUT/DELETE /api/.../vehicles to verify persistence.
-- ------------------------------------------------------------
SELECT v."Id" AS vehicle_id,
       v."LicensePlate",
       v."Brand",
       v."Model",
       v."Year",
       v."MileageKm",
       v."EnginePowerHp",
       v."EngineTorqueNm",
       c."Id" AS customer_id,
       c."Email" AS customer_email
FROM vehicles v
JOIN people c ON c."Id" = v."CustomerId"
WHERE c."PersonType" = 'Customer'
ORDER BY v."Id";


-- ------------------------------------------------------------
-- 11. CUSTOMER DELETION INTEGRITY
--     Verifies no orphaned vehicles remain after customer deletion.
--     Expected: 0 rows.
-- ------------------------------------------------------------
SELECT v."Id" AS orphaned_vehicle_id,
       v."LicensePlate"
FROM vehicles v
LEFT JOIN people c ON c."Id" = v."CustomerId" AND c."PersonType" = 'Customer'
WHERE c."Id" IS NULL;


-- ------------------------------------------------------------
-- 12. VEHICLE DELETION INTEGRITY
--     Verifies no orphaned appointments remain after vehicle deletion.
--     Expected: 0 rows.
-- ------------------------------------------------------------
SELECT a."Id" AS orphaned_appointment_id,
       a."ScheduledDate"
FROM appointments a
LEFT JOIN vehicles v ON v."Id" = a."VehicleId"
WHERE v."Id" IS NULL;


-- ------------------------------------------------------------
-- 13. CUSTOMER APPOINTMENT CREATION COVERAGE
--     Use after POST /api/customers/{customerId}/appointments to verify created rows.
--     The taskDescription filter matches the api-tests/appointments.http payload.
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."ScheduledDate",
       a."IntakeCreatedAt",
       a."DueDateTime",
       a."Status",
       a."TaskDescription",
       v."Id" AS vehicle_id,
       v."LicensePlate",
       c."Id" AS customer_id,
       c."Email" AS customer_email,
       COUNT(am."MechanicId") AS assigned_mechanic_count,
       CASE
           WHEN COUNT(am."MechanicId") = 0 THEN 'FAIL: created appointment has zero mechanics'
           WHEN a."IntakeCreatedAt" IS NULL THEN 'FAIL: missing IntakeCreatedAt'
           WHEN a."DueDateTime" < a."ScheduledDate" THEN 'FAIL: DueDateTime before ScheduledDate'
           ELSE 'OK'
       END AS assignment_integrity
FROM appointments a
JOIN vehicles v ON v."Id" = a."VehicleId"
JOIN people c ON c."Id" = v."CustomerId" AND c."PersonType" = 'Customer'
LEFT JOIN appointmentmechanics am ON am."AppointmentId" = a."Id"
WHERE a."TaskDescription" ILIKE '%idopont felvetele admin oldalon%'
GROUP BY a."Id", a."ScheduledDate", a."IntakeCreatedAt", a."DueDateTime", a."Status", a."TaskDescription", v."Id", v."LicensePlate", c."Id", c."Email"
ORDER BY a."ScheduledDate" DESC, a."Id" DESC;


-- ------------------------------------------------------------
-- 16. INTAKE PAST-DATE ALLOWED CHECK
--     Confirms intake payload with past scheduledDate is now persisted.
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."ScheduledDate",
       a."DueDateTime",
       a."TaskDescription",
       CASE
           WHEN a."ScheduledDate" <> TIMESTAMPTZ '2020-01-01T09:00:00Z' THEN 'FAIL: unexpected ScheduledDate'
           WHEN a."DueDateTime" <> TIMESTAMPTZ '2020-01-03T10:00:00Z' THEN 'FAIL: unexpected DueDateTime'
           ELSE 'OK'
       END AS past_date_integrity
FROM appointments a
WHERE a."TaskDescription" = 'Scheduler intake with past date allowed';


-- ------------------------------------------------------------
-- 15. APPOINTMENT UPDATE COVERAGE
--     Use after PUT /api/appointments/{id} to verify appointment and vehicle edits.
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."ScheduledDate",
       a."DueDateTime",
       a."TaskDescription",
       v."LicensePlate",
       v."Brand",
       v."Model",
       v."Year",
       v."MileageKm",
       v."EnginePowerHp",
       v."EngineTorqueNm",
       CASE
           WHEN a."DueDateTime" < a."ScheduledDate" THEN 'FAIL: DueDateTime before ScheduledDate'
           WHEN v."LicensePlate" <> 'ABC-101' THEN 'FAIL: LicensePlate did not persist'
           WHEN v."Brand" <> 'Volkswagen' THEN 'FAIL: Brand did not persist'
           WHEN v."Model" <> 'Golf' THEN 'FAIL: Model did not persist'
           WHEN v."Year" <> 2018 THEN 'FAIL: Year did not persist'
           WHEN v."MileageKm" <> 124500 THEN 'FAIL: MileageKm did not persist'
           WHEN v."EnginePowerHp" <> 112 THEN 'FAIL: EnginePowerHp did not persist'
           WHEN v."EngineTorqueNm" <> 252 THEN 'FAIL: EngineTorqueNm did not persist'
           ELSE 'OK'
       END AS update_integrity
FROM appointments a
JOIN vehicles v ON v."Id" = a."VehicleId"
WHERE a."TaskDescription" ILIKE '%Frissitett feladat leiras az admin szerkeszteshez%'
ORDER BY a."ScheduledDate" DESC, a."Id" DESC;


-- ------------------------------------------------------------
-- 14. SCHEDULER INTAKE COVERAGE
--     Use after POST /api/appointments/intake to verify customer/vehicle intake writes.
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."ScheduledDate",
       a."IntakeCreatedAt",
       a."DueDateTime",
       a."Status",
       a."TaskDescription",
       c."Email" AS customer_email,
       v."LicensePlate",
       COUNT(am."MechanicId") AS assigned_mechanic_count,
       CASE
           WHEN a."IntakeCreatedAt" IS NULL THEN 'FAIL: missing IntakeCreatedAt'
           WHEN a."DueDateTime" < a."ScheduledDate" THEN 'FAIL: DueDateTime before ScheduledDate'
           WHEN COUNT(am."MechanicId") <> 1 THEN 'WARN: expected one auto-assigned mechanic from intake caller'
           ELSE 'OK'
       END AS intake_integrity
FROM appointments a
JOIN vehicles v ON v."Id" = a."VehicleId"
JOIN people c ON c."Id" = v."CustomerId" AND c."PersonType" = 'Customer'
LEFT JOIN appointmentmechanics am ON am."AppointmentId" = a."Id"
WHERE a."TaskDescription" ILIKE '%Scheduler intake%'
GROUP BY a."Id", a."ScheduledDate", a."IntakeCreatedAt", a."DueDateTime", a."Status", a."TaskDescription", c."Email", v."LicensePlate"
ORDER BY a."ScheduledDate" DESC, a."Id" DESC;


-- ------------------------------------------------------------
-- 17. PAST APPOINTMENT SCHEDULED-DATE UPDATE REJECTION CHECK
--     The negative PUT /api/appointments/{id} payload with this task description must not persist.
--     Expected: 0 rows.
-- ------------------------------------------------------------
SELECT a."Id" AS unexpectedly_updated_appointment_id,
       a."ScheduledDate",
       a."TaskDescription"
FROM appointments a
WHERE a."TaskDescription" = 'Past appointment scheduled date change should be rejected';


-- ------------------------------------------------------------
-- 18. CUSTOMER APPOINTMENT CREATE PAST-DATE ALLOWED CHECK
--     Confirms POST /api/customers/{customerId}/appointments with past
--     scheduledDate is now persisted.
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."ScheduledDate",
       a."DueDateTime",
       a."TaskDescription",
       CASE
           WHEN a."ScheduledDate" <> TIMESTAMPTZ '2020-01-01T10:30:00Z' THEN 'FAIL: unexpected ScheduledDate'
           WHEN a."DueDateTime" <> TIMESTAMPTZ '2020-01-01T10:30:00Z' THEN 'FAIL: unexpected DueDateTime'
           ELSE 'OK'
       END AS past_date_integrity
FROM appointments a
WHERE a."TaskDescription" = 'Admin create with past date allowed';


-- ------------------------------------------------------------
-- 19. MECHANIC-EMAIL INTAKE LINKED CUSTOMER CHECK
--     Confirms intake with mechanic email persisted under linked customer identity.
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."ScheduledDate",
       a."TaskDescription",
       c."Email" AS persisted_customer_email,
       CASE
           WHEN c."Email" LIKE 'mechanic-owner-%@customers.arsm.local' THEN 'OK'
           ELSE 'WARN: expected mechanic-owned customer email'
       END AS linked_customer_resolution
FROM appointments a
JOIN vehicles v ON v."Id" = a."VehicleId"
JOIN people c ON c."Id" = v."CustomerId" AND c."PersonType" = 'Customer'
WHERE a."TaskDescription" = 'Scheduler intake mechanic email linked flow'
ORDER BY a."Id" DESC;


-- ------------------------------------------------------------
-- 20. INTAKE VEHICLE NUMERIC-MAX REJECTION CHECK
--     The negative intake payload with this task description must not persist.
--     Expected: 0 rows.
-- ------------------------------------------------------------
SELECT a."Id" AS unexpected_persisted_appointment_id,
       a."ScheduledDate",
       a."TaskDescription"
FROM appointments a
WHERE a."TaskDescription" = 'Scheduler intake vehicle numeric max should be rejected';


-- ------------------------------------------------------------
-- 21. APPOINTMENT UPDATE NUMERIC-MAX REJECTION CHECK
--     The negative update payload with this task description must not persist.
--     Expected: 0 rows.
-- ------------------------------------------------------------
SELECT a."Id" AS unexpectedly_updated_appointment_id,
       a."ScheduledDate",
       a."TaskDescription"
FROM appointments a
WHERE a."TaskDescription" = 'Admin update vehicle numeric max should be rejected';


-- ------------------------------------------------------------
-- 22. PAST APPOINTMENT PARTIAL UPDATE ALLOWED CHECK
--     Confirms dueDateTime/taskDescription edits are persisted for past appointments
--     when ScheduledDate remains unchanged.
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."ScheduledDate",
       a."DueDateTime",
       a."TaskDescription",
       CASE
           WHEN a."DueDateTime" < a."ScheduledDate" THEN 'FAIL: DueDateTime before ScheduledDate'
           ELSE 'OK'
       END AS partial_update_integrity
FROM appointments a
WHERE a."TaskDescription" = 'Past appointment due and task update allowed'
ORDER BY a."Id" DESC;


-- ------------------------------------------------------------
-- 23. SCHEDULER CUSTOMER BY-EMAIL SUCCESS SEMANTICS (MECHANIC EMAIL)
--     Documents expected 200 behavior for GET /api/customers/by-email when
--     queried with mechanic email and linked customer may or may not exist.
-- ------------------------------------------------------------
SELECT m."Id" AS mechanic_id,
       m."Email" AS mechanic_email,
       c."Id" AS linked_customer_id,
       c."Email" AS linked_customer_email,
       COUNT(v."Id") AS linked_vehicle_count,
       CASE
           WHEN c."Id" IS NULL THEN 'Expected /by-email success semantics: 200 with mechanic identity and empty vehicles.'
           ELSE 'Expected /by-email success semantics: 200 with linked customer payload and linked vehicles.'
       END AS expected_lookup_semantics
FROM people m
LEFT JOIN people c ON c."Email" = ('mechanic-owner-' || m."Id"::text || '@customers.arsm.local')
    AND c."PersonType" = 'Customer'
LEFT JOIN vehicles v ON v."CustomerId" = c."Id"
WHERE m."PersonType" = 'Mechanic'
GROUP BY m."Id", m."Email", c."Id", c."Email"
ORDER BY m."Id";
