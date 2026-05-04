-- ------------------------------------------------------------
-- FEATURE FLOW - UNIQUENESS GUARDS
-- ------------------------------------------------------------
-- Verifies that the operational dataset does not contain duplicate values
-- for customer contact fields and vehicle license plates.
-- Expected result: 0 rows.
-- ------------------------------------------------------------
SELECT duplicate_type,
       duplicate_key,
       duplicate_count
FROM (
    SELECT 'people_email' AS duplicate_type, LOWER(p."Email") AS duplicate_key, COUNT(*)::int AS duplicate_count
    FROM people p
    WHERE p."Email" IS NOT NULL
    GROUP BY LOWER(p."Email")
    HAVING COUNT(*) > 1

    UNION ALL

    SELECT 'people_phone', p."PhoneNumber", COUNT(*)::int
    FROM people p
    WHERE p."PhoneNumber" IS NOT NULL
    GROUP BY p."PhoneNumber"
    HAVING COUNT(*) > 1

    UNION ALL

    SELECT 'vehicle_license_plate', UPPER(v."LicensePlate"), COUNT(*)::int
    FROM vehicles v
    WHERE v."LicensePlate" IS NOT NULL
    GROUP BY UPPER(v."LicensePlate")
    HAVING COUNT(*) > 1
) duplicates
ORDER BY duplicate_type, duplicate_key;
