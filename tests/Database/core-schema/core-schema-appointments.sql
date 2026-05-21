-- ============================================================
-- AutoService DB — Appointments and assignment-focused checks
-- Read-only validation queries only.
-- ============================================================

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
