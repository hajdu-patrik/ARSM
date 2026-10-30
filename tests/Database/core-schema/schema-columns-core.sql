-- AutoService DB - column contract of people (TPH), vehicles, appointments, appointmentmechanics, companyprofiles.
-- Assertion idiom: a violation makes the closing cast fail; kinds: int, vc (varchar), bool, tstz, num (18,2), text.

-- 1. Every modelled column exists with its exact type, length and nullability, and no other column exists.
--    Catches the legacy ProfilePicture/EnginePowerHp/EngineTorqueNm columns and a physical xmin column.
WITH expected (tbl, col, kind, len, nullable) AS (
    VALUES
        ('people', 'Id', 'int', NULL, 'NO'),
        ('people', 'FirstName', 'vc', 50, 'NO'),
        ('people', 'MiddleName', 'vc', 50, 'YES'),
        ('people', 'LastName', 'vc', 50, 'NO'),
        ('people', 'Email', 'vc', 150, 'NO'),
        ('people', 'PhoneNumber', 'vc', 20, 'YES'),
        ('people', 'PersonType', 'vc', 8, 'NO'),
        ('people', 'IdentityUserId', 'vc', 450, 'YES'),
        ('people', 'ProfilePictureObjectKey', 'vc', 256, 'YES'),
        ('people', 'ProfilePictureETag', 'vc', 80, 'YES'),
        ('people', 'ProfilePictureContentType', 'vc', 50, 'YES'),
        ('people', 'TokensValidAfter', 'tstz', NULL, 'YES'),
        ('people', 'Specialization', 'vc', 64, 'YES'),
        ('people', 'Expertise', 'vc', 256, 'YES'),
        ('people', 'MustChangePassword', 'bool', NULL, 'YES'),
        ('vehicles', 'Id', 'int', NULL, 'NO'),
        ('vehicles', 'LicensePlate', 'vc', 20, 'NO'),
        ('vehicles', 'Vin', 'vc', 17, 'NO'),
        ('vehicles', 'Brand', 'vc', 50, 'NO'),
        ('vehicles', 'Model', 'vc', 50, 'NO'),
        ('vehicles', 'Year', 'int', NULL, 'NO'),
        ('vehicles', 'MileageKm', 'int', NULL, 'NO'),
        ('vehicles', 'EnginePowerKw', 'int', NULL, 'NO'),
        ('vehicles', 'DrivetrainType', 'vc', 16, 'NO'),
        ('vehicles', 'CustomerId', 'int', NULL, 'NO'),
        ('appointments', 'Id', 'int', NULL, 'NO'),
        ('appointments', 'ScheduledDate', 'tstz', NULL, 'NO'),
        ('appointments', 'IntakeCreatedAt', 'tstz', NULL, 'NO'),
        ('appointments', 'DueDateTime', 'tstz', NULL, 'NO'),
        ('appointments', 'TaskDescription', 'vc', 200, 'NO'),
        ('appointments', 'Status', 'vc', 32, 'NO'),
        ('appointments', 'CompletedAt', 'tstz', NULL, 'YES'),
        ('appointments', 'CanceledAt', 'tstz', NULL, 'YES'),
        ('appointments', 'VehicleId', 'int', NULL, 'NO'),
        ('appointmentmechanics', 'AppointmentId', 'int', NULL, 'NO'),
        ('appointmentmechanics', 'MechanicId', 'int', NULL, 'NO'),
        ('companyprofiles', 'Id', 'int', NULL, 'NO'),
        ('companyprofiles', 'Name', 'vc', 150, 'NO'),
        ('companyprofiles', 'AddressLine', 'vc', 150, 'NO'),
        ('companyprofiles', 'PostalCode', 'vc', 4, 'NO'),
        ('companyprofiles', 'City', 'vc', 50, 'NO'),
        ('companyprofiles', 'TaxNumber', 'vc', 13, 'NO'),
        ('companyprofiles', 'PhoneNumber', 'vc', 20, 'NO'),
        ('companyprofiles', 'Email', 'vc', 150, 'NO')
),
actual AS (
    SELECT c.table_name::text AS tbl,
           c.column_name::text AS col,
           c.data_type::text AS data_type,
           c.character_maximum_length AS len,
           c.numeric_precision AS prec,
           c.numeric_scale AS scale,
           c.is_nullable::text AS nullable
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name IN (SELECT tbl FROM expected)
),
violations AS (
    SELECT e.tbl || '.' || e.col || ' expected ' || e.kind || ' got ' || COALESCE(a.data_type, 'missing') AS detail
    FROM expected e
    LEFT JOIN actual a ON a.tbl = e.tbl AND a.col = e.col
    WHERE a.col IS NULL
       OR a.data_type <> CASE e.kind
              WHEN 'int' THEN 'integer'
              WHEN 'vc' THEN 'character varying'
              WHEN 'bool' THEN 'boolean'
              WHEN 'tstz' THEN 'timestamp with time zone'
              WHEN 'num' THEN 'numeric'
              ELSE 'text' END
       OR a.len IS DISTINCT FROM e.len
       OR (e.kind = 'num' AND (a.prec <> 18 OR a.scale <> 2))
       OR a.nullable <> e.nullable
    UNION ALL
    SELECT a.tbl || '.' || a.col || ' is not part of the model'
    FROM actual a
    LEFT JOIN expected e ON e.tbl = a.tbl AND e.col = a.col
    WHERE e.col IS NULL
)
SELECT 'core_columns' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL core_columns: ', COUNT(*), ' mismatch(es), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM violations v;


-- 2. people.MustChangePassword is a nullable boolean defaulting to false (TPH column shared with customer rows).
SELECT 'people_must_change_password_default' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL people_must_change_password_default: default is ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT COALESCE(column_default::text, 'NULL') AS detail
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'people'
      AND column_name = 'MustChangePassword'
      AND column_default IS DISTINCT FROM 'false'
) v;
