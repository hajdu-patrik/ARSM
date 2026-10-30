-- AutoService DB - vehicle rows beyond the column and CHECK contracts: normalized plate, trimmed text, handler caps.
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. License plates are stored normalized (LicensePlateNormalization): trimmed, at least 2 characters, one digit
--    at least, no repeated separators or spaces, no lower-case ASCII letters.
SELECT 'vehicle_license_plate_normalized' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL vehicle_license_plate_normalized: ', COUNT(*), ' vehicle(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT ve."Id"::text AS detail
    FROM vehicles ve
    WHERE ve."LicensePlate" <> btrim(ve."LicensePlate")
       OR length(ve."LicensePlate") < 2
       OR ve."LicensePlate" !~ '[[:digit:]]'
       OR ve."LicensePlate" ~ '[a-z]'
       OR ve."LicensePlate" ~ '[[:space:]]{2,}'
       OR ve."LicensePlate" ~ '[ .,''-]{2,}'
) v;


-- 2. Brand and model are trimmed and non-blank (VehicleInput stores them trimmed; the columns only forbid NULL).
SELECT 'vehicle_brand_model_trimmed' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL vehicle_brand_model_trimmed: ', COUNT(*), ' vehicle(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT ve."Id"::text AS detail
    FROM vehicles ve
    WHERE btrim(ve."Brand") = ''
       OR ve."Brand" <> btrim(ve."Brand")
       OR btrim(ve."Model") = ''
       OR ve."Model" <> btrim(ve."Model")
) v;


-- 3. Handler caps that no CHECK repeats: mileage up to 1,000,000 km, power up to 50,000 kW, and a DrivetrainType
--    that is one of the five enum names. Year, VIN and the non-negative bounds are CHECKs (schema-check-constraints.sql).
SELECT 'vehicle_numeric_caps_and_drivetrain' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL vehicle_numeric_caps_and_drivetrain: ', COUNT(*), ' vehicle(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT ve."Id"::text AS detail
    FROM vehicles ve
    WHERE ve."MileageKm" > 1000000
       OR ve."EnginePowerKw" > 50000
       OR ve."DrivetrainType" NOT IN ('Petrol', 'Diesel', 'Hybrid', 'PHEV', 'Electric')
) v;
