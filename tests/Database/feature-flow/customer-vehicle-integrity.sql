-- AutoService DB - vehicle ownership: only customers own vehicles (the foreign keys cover the rest of the chain).
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. A vehicle belongs to a Customer row. vehicles.CustomerId references the shared people table, so only this
--    check keeps a mechanic from owning a vehicle (cascade deletes under a customer would otherwise skip it).
SELECT 'vehicle_owner_is_customer' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL vehicle_owner_is_customer: ', COUNT(*), ' vehicle(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT ve."Id"::text AS detail
    FROM vehicles ve
    JOIN people p ON p."Id" = ve."CustomerId"
    WHERE p."PersonType" <> 'Customer'
) v;

