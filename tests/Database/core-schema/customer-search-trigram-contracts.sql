-- AutoService DB - trigram search contracts of AddTrigramSearchIndexes (backs GET /api/customers/by-name).
-- Assertion idiom: a violation makes the closing cast fail.

-- 1. The pg_trgm extension is installed: the root cause when every trigram index below is missing.
SELECT 'pg_trgm_extension' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL pg_trgm_extension: ', COUNT(*), ' problem(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT 'pg_trgm is not installed' AS detail
    WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm')
) v;


-- 2. All 7 indexes stay GIN with gin_trgm_ops on the upper()/replace() expression the customer lookup repeats,
--    or Postgres silently stops using them. The combined-name indexes keep the ' ' separator.
SELECT 'trigram_index_expressions' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL trigram_index_expressions: ', COUNT(*), ' mismatch(es), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT e.index_name || ' on ' || e.table_name || ' is missing or lost its expression: ' || COALESCE(i.indexdef, 'absent') AS detail
    FROM (VALUES
        ('people', 'IX_people_FirstName_Trgm', 'upper(', '"FirstName"'),
        ('people', 'IX_people_MiddleName_Trgm', 'upper(', '"MiddleName"'),
        ('people', 'IX_people_LastName_Trgm', 'upper(', '"LastName"'),
        ('people', 'IX_people_FirstName_LastName_Trgm', '"FirstName"', ''' ''::text'),
        ('people', 'IX_people_FirstName_MiddleName_LastName_Trgm', '"MiddleName"', '"LastName"'),
        ('vehicles', 'IX_vehicles_LicensePlate_Trgm', 'upper(', '"LicensePlate"'),
        ('vehicles', 'IX_vehicles_LicensePlate_Compact_Trgm', 'replace(', '"LicensePlate"')
    ) AS e (table_name, index_name, frag1, frag2)
    LEFT JOIN pg_indexes i
           ON i.schemaname = 'public'
          AND i.tablename = e.table_name
          AND i.indexname = e.index_name
    WHERE i.indexname IS NULL
       OR position('USING gin' IN i.indexdef) = 0
       OR position('gin_trgm_ops' IN i.indexdef) = 0
       OR position('upper(' IN i.indexdef) = 0
       OR position(e.frag1 IN i.indexdef) = 0
       OR position(e.frag2 IN i.indexdef) = 0
) v;
