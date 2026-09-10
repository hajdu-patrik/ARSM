-- ============================================================
-- AutoService DB — Pricing catalog schema contract checks
-- Verifies persistence contracts from the AddPricingCatalog migration
-- (parts, labortypes). Read-only validation queries only.
-- AI policy: use ai_agent_test_user and run SELECT queries only.
-- ============================================================

-- ------------------------------------------------------------
-- 18. PRICING CATALOG NUMERIC PRECISION CONTRACT
--     parts.NetUnitPrice and labortypes.HourlyNetRate must be genuinely
--     numeric(18,2) — precision 18, scale 2 — not a bare numeric and not
--     a double precision. AddPricingCatalog is the first migration with
--     decimal columns in the repo; a missing precision/scale would
--     silently break rounding.
--     Expected: 0 rows.
-- ------------------------------------------------------------
WITH expected_money_columns (table_name, column_name) AS (
    VALUES
        ('parts', 'NetUnitPrice'),
        ('labortypes', 'HourlyNetRate')
)
SELECT e.table_name,
       e.column_name,
       c.data_type,
       c.numeric_precision,
       c.numeric_scale
FROM expected_money_columns e
LEFT JOIN information_schema.columns c
       ON c.table_schema = 'public'
      AND c.table_name = e.table_name
      AND c.column_name = e.column_name
WHERE c.column_name IS NULL
   OR c.data_type <> 'numeric'
   OR c.numeric_precision <> 18
   OR c.numeric_scale <> 2
ORDER BY e.table_name, e.column_name;


-- ------------------------------------------------------------
-- 19. PRICING CATALOG CHECK CONSTRAINT CONTRACT
--     All four named check constraints must exist, and their definitions
--     must carry both fragments checked below. A constraint that only
--     rejects negative values, or only asserts VAT membership without the
--     full 0/5/18/27 set, would pass a naive existence check while
--     leaving the upper-bound / typo protection missing.
--     Expected: 0 rows.
-- ------------------------------------------------------------
WITH expected_constraints (table_name, constraint_name, required_fragment_1, required_fragment_2) AS (
    VALUES
        ('parts',      'CK_Parts_NetUnitPrice',       '>= (0)',  '<= (100000000)'),
        ('parts',      'CK_Parts_VatRate',            '0, 5',    '18, 27'),
        ('labortypes', 'CK_LaborTypes_HourlyNetRate',  '>= (0)',  '<= (100000000)'),
        ('labortypes', 'CK_LaborTypes_VatRate',        '0, 5',    '18, 27')
)
SELECT e.table_name,
       e.constraint_name,
       pg_get_constraintdef(pc.oid) AS actual_definition
FROM expected_constraints e
LEFT JOIN pg_constraint pc
       ON pc.conname = e.constraint_name
      AND pc.contype = 'c'
LEFT JOIN pg_class t
       ON t.oid = pc.conrelid
      AND t.relname = e.table_name
WHERE t.relname IS NULL
   OR pg_get_constraintdef(pc.oid) NOT LIKE '%' || e.required_fragment_1 || '%'
   OR pg_get_constraintdef(pc.oid) NOT LIKE '%' || e.required_fragment_2 || '%'
ORDER BY e.table_name, e.constraint_name;


-- ------------------------------------------------------------
-- 20. PRICING CATALOG UNIQUE INDEX CONTRACT
--     IX_parts_PartNumber and IX_labortypes_Code must exist on their
--     tables and be declared unique.
--     Expected: 0 rows.
-- ------------------------------------------------------------
WITH expected_indexes (table_name, index_name) AS (
    VALUES
        ('parts', 'IX_parts_PartNumber'),
        ('labortypes', 'IX_labortypes_Code')
)
SELECT e.table_name,
       e.index_name,
       i.indisunique
FROM expected_indexes e
LEFT JOIN pg_class ic ON ic.relname = e.index_name
LEFT JOIN pg_index i ON i.indexrelid = ic.oid
LEFT JOIN pg_class t ON t.oid = i.indrelid AND t.relname = e.table_name
WHERE t.relname IS NULL
   OR i.indisunique IS NOT TRUE
ORDER BY e.table_name, e.index_name;


-- ------------------------------------------------------------
-- 21. PRICING CATALOG STRING LENGTH CONTRACT
--     parts.PartNumber and labortypes.Code carry maxlength 40; parts.Name
--     and labortypes.Name carry maxlength 120.
--     Expected: 0 rows.
-- ------------------------------------------------------------
WITH expected_lengths (table_name, column_name, expected_max_length) AS (
    VALUES
        ('parts', 'PartNumber', 40),
        ('parts', 'Name', 120),
        ('labortypes', 'Code', 40),
        ('labortypes', 'Name', 120)
)
SELECT e.table_name,
       e.column_name,
       e.expected_max_length,
       c.character_maximum_length AS actual_max_length
FROM expected_lengths e
LEFT JOIN information_schema.columns c
       ON c.table_schema = 'public'
      AND c.table_name = e.table_name
      AND c.column_name = e.column_name
WHERE c.column_name IS NULL
   OR c.character_maximum_length IS DISTINCT FROM e.expected_max_length
ORDER BY e.table_name, e.column_name;
