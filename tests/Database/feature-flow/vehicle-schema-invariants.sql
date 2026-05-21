-- ------------------------------------------------------------
-- FEATURE FLOW - VEHICLE SCHEMA INVARIANTS
-- ------------------------------------------------------------
-- Verifies persisted vehicle rows match the technical-field contracts from
-- AutoServiceDbContext and the VehicleSchemaRefactor migration.
-- Expected result: 0 rows.
-- AI policy: use ai_agent_test_user and run SELECT queries only.
-- ------------------------------------------------------------
SELECT v."Id" AS vehicle_id,
       v."LicensePlate",
       v."Vin",
       v."Brand",
       v."Model",
       v."Year",
       v."MileageKm",
       v."EnginePowerKw",
       v."DrivetrainType",
       CASE
           WHEN v."LicensePlate" IS NULL OR BTRIM(v."LicensePlate") = '' THEN 'FAIL: LicensePlate is required'
           WHEN v."Vin" IS NULL OR BTRIM(v."Vin") = '' THEN 'FAIL: Vin is required'
           WHEN LENGTH(v."Vin") <> 17 THEN 'FAIL: Vin must be 17 characters'
           WHEN v."Vin" !~ '^[A-HJ-NPR-Z0-9]{17}$' THEN 'FAIL: Vin has invalid characters'
           WHEN v."Brand" IS NULL OR BTRIM(v."Brand") = '' THEN 'FAIL: Brand is required'
           WHEN v."Model" IS NULL OR BTRIM(v."Model") = '' THEN 'FAIL: Model is required'
           WHEN v."Year" IS NULL THEN 'FAIL: Year is required'
           WHEN v."MileageKm" IS NULL THEN 'FAIL: MileageKm is required'
           WHEN v."EnginePowerKw" IS NULL THEN 'FAIL: EnginePowerKw is required'
           WHEN v."EnginePowerKw" < 0 THEN 'FAIL: EnginePowerKw must be non-negative'
           WHEN v."DrivetrainType" IS NULL OR BTRIM(v."DrivetrainType") = '' THEN 'FAIL: DrivetrainType is required'
           WHEN v."DrivetrainType" NOT IN ('Petrol', 'Diesel', 'Hybrid', 'PHEV', 'Electric') THEN 'FAIL: DrivetrainType is not allowed'
           ELSE 'OK'
       END AS vehicle_schema_integrity
FROM vehicles v
WHERE v."LicensePlate" IS NULL
   OR BTRIM(v."LicensePlate") = ''
   OR v."Vin" IS NULL
   OR BTRIM(v."Vin") = ''
   OR LENGTH(v."Vin") <> 17
   OR v."Vin" !~ '^[A-HJ-NPR-Z0-9]{17}$'
   OR v."Brand" IS NULL
   OR BTRIM(v."Brand") = ''
   OR v."Model" IS NULL
   OR BTRIM(v."Model") = ''
   OR v."Year" IS NULL
   OR v."MileageKm" IS NULL
   OR v."EnginePowerKw" IS NULL
   OR v."EnginePowerKw" < 0
   OR v."DrivetrainType" IS NULL
   OR BTRIM(v."DrivetrainType") = ''
   OR v."DrivetrainType" NOT IN ('Petrol', 'Diesel', 'Hybrid', 'PHEV', 'Electric')
ORDER BY v."Id";