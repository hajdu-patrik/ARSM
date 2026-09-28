-- AutoService DB — Customer/vehicle trigram search contracts (AddTrigramSearchIndexes migration,
-- backs GET /api/customers/by-name). AI SQL policy: ai_agent_test_user, SELECT-only — see tests/CLAUDE.md.

-- 29. PG_TRGM EXTENSION CONTRACT — fails fast on the pg_trgm root cause instead of 7 cascading missing-index rows.
--     Expected: 1 row (extname = 'pg_trgm').
SELECT extname
FROM pg_extension
WHERE extname = 'pg_trgm';


-- 30. TRIGRAM INDEX EXPRESSION CONTRACT — all 7 indexes must stay GIN/gin_trgm_ops on the exact
--     upper()/replace() expression from CustomerEndpoints.Lookup.cs, or Postgres silently ignores them. Expected: 0 rows.
WITH expected_indexes (table_name, index_name, required_fragment_1, required_fragment_2) AS (
    VALUES
        ('people',   'IX_people_FirstName_Trgm',                     'upper(',   '"FirstName"'),
        ('people',   'IX_people_MiddleName_Trgm',                    'upper(',   '"MiddleName"'),
        ('people',   'IX_people_LastName_Trgm',                      'upper(',   '"LastName"'),
        ('people',   'IX_people_FirstName_LastName_Trgm',            '"FirstName"', '"LastName"'),
        ('people',   'IX_people_FirstName_MiddleName_LastName_Trgm', '"MiddleName"', '"LastName"'),
        ('vehicles', 'IX_vehicles_LicensePlate_Trgm',                 'upper(',   '"LicensePlate"'),
        ('vehicles', 'IX_vehicles_LicensePlate_Compact_Trgm',         'replace(', '"LicensePlate"')
)
SELECT e.table_name,
       e.index_name,
       i.indexdef AS actual_definition
FROM expected_indexes e
LEFT JOIN pg_indexes i
       ON i.tablename = e.table_name
      AND i.indexname = e.index_name
WHERE i.indexname IS NULL
   OR i.indexdef NOT LIKE '%USING gin%'
   OR i.indexdef NOT LIKE '%gin_trgm_ops%'
   OR i.indexdef NOT LIKE '%' || e.required_fragment_1 || '%'
   OR i.indexdef NOT LIKE '%' || e.required_fragment_2 || '%'
ORDER BY e.table_name, e.index_name;
