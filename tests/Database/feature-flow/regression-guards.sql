-- 14. SCHEDULER INTAKE COVERAGE
--     Use after POST /api/appointments/intake to verify customer/vehicle intake writes.
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


-- 17. PAST APPOINTMENT SCHEDULED-DATE UPDATE REJECTION CHECK — this negative PUT payload must not persist.
--     Expected: 0 rows.
SELECT a."Id" AS unexpectedly_updated_appointment_id,
       a."ScheduledDate",
       a."TaskDescription"
FROM appointments a
WHERE a."TaskDescription" = 'Past appointment scheduled date change should be rejected';


-- 18. CUSTOMER APPOINTMENT CREATE PAST-DATE ALLOWED CHECK — POST .../appointments with a past
--     scheduledDate must now persist.
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


-- 19. MECHANIC-EMAIL INTAKE LINKED CUSTOMER CHECK
--     Confirms intake with mechanic email persisted under linked customer identity.
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


-- 20. INTAKE VEHICLE NUMERIC-MAX REJECTION CHECK — this negative intake payload must not persist.
--     Expected: 0 rows.
SELECT a."Id" AS unexpected_persisted_appointment_id,
       a."ScheduledDate",
       a."TaskDescription"
FROM appointments a
WHERE a."TaskDescription" = 'Scheduler intake vehicle numeric max should be rejected';


-- 21. APPOINTMENT UPDATE NUMERIC-MAX REJECTION CHECK — this negative update payload must not persist.
--     Expected: 0 rows.
SELECT a."Id" AS unexpectedly_updated_appointment_id,
       a."ScheduledDate",
       a."TaskDescription"
FROM appointments a
WHERE a."TaskDescription" = 'Admin update vehicle numeric max should be rejected';


-- 22. PAST APPOINTMENT PARTIAL UPDATE ALLOWED CHECK — dueDateTime/taskDescription edits persist for
--     past appointments when ScheduledDate is unchanged.
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


-- 23. SCHEDULER CUSTOMER BY-EMAIL SUCCESS SEMANTICS (MECHANIC EMAIL) — expected 200 for GET
--     /api/customers/by-email whether or not a linked customer exists.
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


-- 24. APPOINTMENT ASSIGNMENT INTEGRITY (ORPHAN GUARD) — no appointment without an assigned mechanic.
--     Expected: 0 rows.
SELECT a."Id" AS orphaned_appointment_id,
       a."ScheduledDate",
       a."Status",
       a."TaskDescription"
FROM appointments a
LEFT JOIN appointmentmechanics am ON am."AppointmentId" = a."Id"
GROUP BY a."Id", a."ScheduledDate", a."Status", a."TaskDescription"
HAVING COUNT(am."MechanicId") = 0
ORDER BY a."Id";
