
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
--     The taskDescription filter matches the tests/API/appointments/ intake payload.
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
-- 24. TEST-CREATED CUSTOMERS (example.test domain)
--     Quick CRUD smoke query for API-created synthetic records.
-- ------------------------------------------------------------
SELECT c."Id" AS customer_id,
             c."Email",
             c."FirstName",
             c."LastName",
             c."PhoneNumber"
FROM people c
WHERE c."PersonType" = 'Customer'
    AND LOWER(c."Email") LIKE '%.example.test'
ORDER BY c."Id" DESC
LIMIT 30;


-- ------------------------------------------------------------
-- 25. TEST-CREATED VEHICLES (runtime plate patterns)
--     Quick CRUD smoke query for API-created synthetic vehicles.
-- ------------------------------------------------------------
SELECT v."Id" AS vehicle_id,
             v."LicensePlate",
             v."Brand",
             v."Model",
             v."Year",
             c."Email" AS owner_email
FROM vehicles v
JOIN people c ON c."Id" = v."CustomerId"
WHERE LOWER(c."Email") LIKE '%.example.test'
     OR v."LicensePlate" LIKE 'NEW-%'
     OR v."LicensePlate" LIKE 'SCH-%'
     OR v."LicensePlate" LIKE 'MEC-%'
ORDER BY v."Id" DESC
LIMIT 30;
