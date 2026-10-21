-- AutoService DB — Migration and schema contract checks
-- Read-only validation queries only.

-- 12. APPLIED MIGRATIONS
SELECT "MigrationId", "ProductVersion"
FROM "__EFMigrationsHistory"
ORDER BY "MigrationId";

-- 13. COLUMN-LEVEL SCHEMA — all public tables
SELECT table_name,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 14. PLACEHOLDER MARKER CHECK — people.Email/PhoneNumber must not carry template markers
--     expected 0 rows.
SELECT "Id", "Email", "PhoneNumber"
FROM people
WHERE "Email"       ILIKE '%CHANGE_ME%'
   OR "Email"       ILIKE '%SET_UNIQUE_LOCAL%'
   OR "PhoneNumber" ILIKE '%CHANGE_ME%'
   OR "PhoneNumber" ILIKE '%SET_UNIQUE_LOCAL%'
ORDER BY "Id";

-- 15. CRITICAL SCHEMA CONTRACTS (INDEXES + CHECK CONSTRAINTS)
--     Confirms persistence contracts from AutoServiceDbContext and migrations.
SELECT contract_type,
       contract_name,
       source_table,
       details
FROM (
    SELECT 'check_constraint'::text AS contract_type,
           c.conname AS contract_name,
           t.relname AS source_table,
           pg_get_constraintdef(c.oid) AS details
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE c.contype = 'c'
      AND t.relname IN ('people', 'vehicles')

    UNION ALL

    SELECT 'index'::text AS contract_type,
           i.indexname AS contract_name,
           i.tablename AS source_table,
           i.indexdef AS details
    FROM pg_indexes i
    WHERE i.tablename IN ('people', 'vehicles', 'appointments', 'refreshtokens', 'revokedjwttokens')
      AND i.indexname IN (
     'IX_people_Email',
     'IX_people_IdentityUserId',
     'IX_people_PhoneNumber',
     'IX_vehicles_LicensePlate',
     'IX_vehicles_Vin',
     'IX_appointments_ScheduledDate',
     'IX_appointments_DueDateTime',
     'IX_refreshtokens_TokenHash',
     'IX_refreshtokens_MechanicId_ExpiresAtUtc',
     'IX_revokedjwttokens_JwtId',
     'IX_revokedjwttokens_ExpiresAtUtc'
      )
) contracts
ORDER BY contract_type, source_table, contract_name;

-- 16. PROFILE PICTURE STORAGE COLUMNS — object-storage contract from AddProfilePictureObjectStorageColumns
--     (after DropProfilePictureBytes removed the bytea column); expect ContentType/ETag/ObjectKey varchars.
SELECT column_name,
       data_type,
       character_maximum_length,
       is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'people'
  AND column_name LIKE 'ProfilePicture%'
ORDER BY column_name;

-- 17. LEGACY PICTURE COLUMN REMOVAL — post-condition of the DropProfilePictureBytes migration.
--     Expected: legacy_profile_picture_columns = 0 (the ProfilePicture bytea column must not return).
SELECT COUNT(*) AS legacy_profile_picture_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'people'
  AND column_name = 'ProfilePicture';

-- 31. PEOPLE PHONE UNIQUE INDEX CONTRACT — IX_people_PhoneNumber must be unique and filtered to rows that carry
--     a phone number (customers may have none). Expected: 0 rows.
SELECT e.index_name,
       i.indisunique,
       pg_get_expr(i.indpred, i.indrelid) AS predicate
FROM (VALUES ('people', 'IX_people_PhoneNumber')) AS e (table_name, index_name)
LEFT JOIN pg_class ic ON ic.relname = e.index_name
LEFT JOIN pg_index i ON i.indexrelid = ic.oid
LEFT JOIN pg_class t ON t.oid = i.indrelid AND t.relname = e.table_name
WHERE t.relname IS NULL
   OR i.indisunique IS NOT TRUE
   OR COALESCE(pg_get_expr(i.indpred, i.indrelid), '') NOT LIKE '%"PhoneNumber" IS NOT NULL%';

-- 32. PEOPLE MUST-CHANGE-PASSWORD COLUMN CONTRACT — a nullable boolean that defaults to false (TPH column on
--     people, only Mechanic rows use it). Expected: 0 rows.
SELECT e.column_name,
       c.data_type,
       c.is_nullable,
       c.column_default
FROM (VALUES ('people', 'MustChangePassword')) AS e (table_name, column_name)
LEFT JOIN information_schema.columns c
       ON c.table_schema = 'public'
      AND c.table_name = e.table_name
      AND c.column_name = e.column_name
WHERE c.column_name IS NULL
   OR c.data_type <> 'boolean'
   OR c.is_nullable <> 'YES'
   OR c.column_default IS DISTINCT FROM 'false';
