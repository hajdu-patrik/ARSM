-- AutoService DB - appointments: status values and stamps, mechanic assignment, dates and rejected-payload guards.
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. Status is one of the ProgressStatus names (no legacy 'Scheduled'), and the stamps match it: Completed has
--    CompletedAt only, Cancelled has CanceledAt only, InProgress has neither (ApplyStatus, startup normalizer).
SELECT 'appointment_status_and_stamps' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL appointment_status_and_stamps: ', COUNT(*), ' appointment(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT a."Id"::text || ' ' || a."Status" AS detail
    FROM appointments a
    WHERE a."Status" NOT IN ('InProgress', 'Completed', 'Cancelled')
       OR (a."Status" = 'Completed' AND (a."CompletedAt" IS NULL OR a."CanceledAt" IS NOT NULL))
       OR (a."Status" = 'Cancelled' AND (a."CanceledAt" IS NULL OR a."CompletedAt" IS NOT NULL))
       OR (a."Status" = 'InProgress' AND (a."CompletedAt" IS NOT NULL OR a."CanceledAt" IS NOT NULL))
) v;


-- 2. No appointment is left without an assigned mechanic (unassign keeps the last one; the admin mechanic delete
--    refuses to orphan one; DatabaseInitializer fails startup on a violation).
SELECT 'appointment_has_mechanic' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL appointment_has_mechanic: ', COUNT(*), ' appointment(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT a."Id"::text AS detail
    FROM appointments a
    WHERE NOT EXISTS (SELECT 1 FROM appointmentmechanics am WHERE am."AppointmentId" = a."Id")
) v;


-- 3. Only mechanics are assigned to appointments (appointmentmechanics.MechanicId references the shared people table).
SELECT 'assigned_person_is_mechanic' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL assigned_person_is_mechanic: ', COUNT(*), ' assignment(s), e.g. appointment ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT am."AppointmentId"::text AS detail
    FROM appointmentmechanics am
    JOIN people p ON p."Id" = am."MechanicId"
    WHERE p."PersonType" <> 'Mechanic'
) v;


-- 4. The deadline is never before the planned date, and the task text is stored trimmed and non-blank.
--    Past dates are allowed (intake and create accept them), so no comparison with now is made.
SELECT 'appointment_dates_and_task' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL appointment_dates_and_task: ', COUNT(*), ' appointment(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT a."Id"::text AS detail
    FROM appointments a
    WHERE a."DueDateTime" < a."ScheduledDate"
       OR btrim(a."TaskDescription") = ''
       OR a."TaskDescription" <> btrim(a."TaskDescription")
) v;


-- 5. Payloads the HTTP suites send expecting a refusal (task text "... should be rejected/blocked", "Intake
--    over-length ...") never reached the table; the suites delete only rows they know, so a leak stays behind.
SELECT 'rejected_payloads_not_persisted' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL rejected_payloads_not_persisted: ', COUNT(*), ' appointment(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT a."Id"::text AS detail
    FROM appointments a
    WHERE a."TaskDescription" ~* 'should be (rejected|blocked)|^intake over-length'
) v;
