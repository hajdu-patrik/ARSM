-- ============================================================
-- AutoService DB — Customer/vehicle trigram search schema contracts
-- Verifies persistence contracts from the AddTrigramSearchIndexes
-- migration, which backs GET /api/customers/by-name
-- (Customers/CustomerEndpoints.Lookup.cs). Read-only validation
-- queries only.
-- AI policy: use ai_agent_test_user and run SELECT queries only.
-- ============================================================

-- ------------------------------------------------------------
-- 29. PG_TRGM EXTENSION CONTRACT
--     A trigram GIN index cannot exist without pg_trgm. If the extension
--     were ever dropped, every index below would already be gone too, but
--     this check fails fast on the actual root cause instead of on seven
--     unrelated-looking missing-index rows.
--     Expected: 1 row (extname = 'pg_trgm').
-- ------------------------------------------------------------
SELECT extname
FROM pg_extension
WHERE extname = 'pg_trgm';


-- ------------------------------------------------------------
-- 30. TRIGRAM INDEX EXPRESSION CONTRACT
--     All seven indexes from AddTrigramSearchIndexes must exist as GIN
--     indexes using gin_trgm_ops, and each indexed expression must still
--     reference the same upper(...)/replace(...) source columns the raw
--     SQL in the migration named (see the comment in
--     CustomerEndpoints.Lookup.cs — Postgres only picks an expression index
--     when the query contains the same expression, so a paraphrased or
--     reordered expression here would leave the index unused without any
--     query ever failing). Fragments are checked as substrings rather than
--     a verbatim pg_get_indexdef() reformat, because Postgres normalizes
--     casts/parens on the stored expression independently of how it was
--     written.
--     Expected: 0 rows.
-- ------------------------------------------------------------
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
