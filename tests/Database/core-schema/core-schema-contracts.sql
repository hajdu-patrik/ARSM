-- ============================================================
-- AutoService DB — Migration and schema contract checks
-- Read-only validation queries only.
-- ============================================================

-- ------------------------------------------------------------
-- 12. APPLIED MIGRATIONS
-- ------------------------------------------------------------
SELECT "MigrationId", "ProductVersion"
FROM "__EFMigrationsHistory"
ORDER BY "MigrationId";

-- ------------------------------------------------------------
-- 13. COLUMN-LEVEL SCHEMA — all public tables
-- ------------------------------------------------------------
SELECT table_name,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ------------------------------------------------------------
-- 14. PLACEHOLDER MARKER CHECK — people.Email and people.PhoneNumber
--     Startup fails fast if secrets still contain template markers
--     (CHANGE_ME, SET_UNIQUE_LOCAL, or punctuation-separated variants).
--     Seeded demo data must never carry unconfigured placeholder values.
--     Expected: 0 rows.
-- ------------------------------------------------------------
SELECT "Id", "Email", "PhoneNumber"
FROM people
WHERE "Email"       ILIKE '%CHANGE_ME%'
   OR "Email"       ILIKE '%SET_UNIQUE_LOCAL%'
   OR "PhoneNumber" ILIKE '%CHANGE_ME%'
   OR "PhoneNumber" ILIKE '%SET_UNIQUE_LOCAL%'
ORDER BY "Id";

-- ------------------------------------------------------------
-- 15. CRITICAL SCHEMA CONTRACTS (INDEXES + CHECK CONSTRAINTS)
--     Confirms persistence contracts from AutoServiceDbContext and migrations.
-- ------------------------------------------------------------
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
