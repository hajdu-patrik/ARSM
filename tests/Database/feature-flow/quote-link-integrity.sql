-- AutoService DB - quote numbers and the links of a quote to its vehicle, appointment and creator.
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. A quote number is ARSM-{yyyy}-{sequence} with a 4-digit year and a sequence zero-padded to at least 4 digits.
SELECT 'quote_number_format' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL quote_number_format: ', COUNT(*), ' quote(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT q."Id"::text || ' ' || q."QuoteNumber" AS detail
    FROM quotes q
    WHERE q."QuoteNumber" !~ '^ARSM-[0-9]{4}-[0-9]{4,}$'
) v;


-- 2. A quote raised for an appointment belongs to the appointment's own vehicle (create answers 422 otherwise).
SELECT 'quote_appointment_same_vehicle' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL quote_appointment_same_vehicle: ', COUNT(*), ' quote(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT q."Id"::text AS detail
    FROM quotes q
    JOIN appointments a ON a."Id" = q."AppointmentId"
    WHERE a."VehicleId" <> q."VehicleId"
) v;


-- 3. The creator, while still set, is a mechanic (the FK targets the shared people table; a deleted creator is NULL).
SELECT 'quote_creator_is_mechanic' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL quote_creator_is_mechanic: ', COUNT(*), ' quote(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT q."Id"::text AS detail
    FROM quotes q
    JOIN people p ON p."Id" = q."CreatedByMechanicId"
    WHERE p."PersonType" <> 'Mechanic'
) v;


-- 4. An appointment carries at most one Accepted quote: once one is accepted, every sibling is locked
--    (quote_locked_appointment_accepted), so a second acceptance cannot happen.
SELECT 'one_accepted_quote_per_appointment' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL one_accepted_quote_per_appointment: ', COUNT(*), ' appointment(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT q."AppointmentId"::text || ' has ' || COUNT(*) || ' accepted quotes' AS detail
    FROM quotes q
    WHERE q."Status" = 'Accepted'
      AND q."AppointmentId" IS NOT NULL
    GROUP BY q."AppointmentId"
    HAVING COUNT(*) > 1
) v;
