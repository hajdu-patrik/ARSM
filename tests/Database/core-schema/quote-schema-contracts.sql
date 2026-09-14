-- ============================================================
-- AutoService DB — Quote schema contract checks
-- Verifies persistence contracts from the AddQuotes migration
-- (quotes, quotelines). Read-only validation queries only.
-- AI policy: use ai_agent_test_user and run SELECT queries only.
-- ============================================================

-- ------------------------------------------------------------
-- 22. QUOTE NUMERIC PRECISION CONTRACT
--     Every money/quantity column on quotes and quotelines must be
--     genuinely numeric(18,2) — precision 18, scale 2 — not a bare
--     numeric and not a double precision. A missing precision/scale would
--     silently break rounding on totals and line amounts.
--     Expected: 0 rows.
-- ------------------------------------------------------------
WITH expected_money_columns (table_name, column_name) AS (
    VALUES
        ('quotes',     'TotalNet'),
        ('quotes',     'TotalVat'),
        ('quotes',     'TotalGross'),
        ('quotelines', 'Quantity'),
        ('quotelines', 'NetUnitPrice'),
        ('quotelines', 'NetAmount'),
        ('quotelines', 'VatAmount'),
        ('quotelines', 'GrossAmount')
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
-- 23. QUOTE ENUM STORAGE CONTRACT
--     quotes.Status and quotelines.LineKind are stored as
--     character varying(16) string-enum conversions
--     (HasConversion<string>), not as integers. A regression back to the
--     EF default int-enum mapping would silently break every existing row.
--     Expected: 0 rows.
-- ------------------------------------------------------------
WITH expected_enum_columns (table_name, column_name, expected_max_length) AS (
    VALUES
        ('quotes',     'Status',   16),
        ('quotelines', 'LineKind', 16)
)
SELECT e.table_name,
       e.column_name,
       c.data_type,
       c.character_maximum_length
FROM expected_enum_columns e
LEFT JOIN information_schema.columns c
       ON c.table_schema = 'public'
      AND c.table_name = e.table_name
      AND c.column_name = e.column_name
WHERE c.column_name IS NULL
   OR c.data_type <> 'character varying'
   OR c.character_maximum_length <> e.expected_max_length
ORDER BY e.table_name, e.column_name;


-- ------------------------------------------------------------
-- 24. QUOTE CHECK CONSTRAINT CONTRACT
--     All five named check constraints must exist, and their definitions
--     must carry both fragments checked below. A constraint that only
--     enforces one bound, or only guards one branch of the Part/Labor
--     line-kind rule, would pass a naive existence check while leaving
--     the other half unprotected.
--     Expected: 0 rows.
-- ------------------------------------------------------------
WITH expected_constraints (table_name, constraint_name, required_fragment_1, required_fragment_2) AS (
    VALUES
        ('quotes',     'CK_Quotes_Totals',               '"TotalGross" = (',                             '"TotalNet" + "TotalVat"'),
        ('quotelines', 'CK_QuoteLines_Quantity',          '> (0)',                                        '<= (10000)'),
        ('quotelines', 'CK_QuoteLines_NetUnitPrice',      '>= (0)',                                       '<= (100000000)'),
        ('quotelines', 'CK_QuoteLines_VatRate',           '0, 5',                                         '18, 27'),
        ('quotelines', 'CK_QuoteLines_LineKindIntegrity', '''Part''::text) AND ("LaborTypeId" IS NULL)',  '''Labor''::text) AND ("PartId" IS NULL)')
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
-- 25. QUOTE INDEX CONTRACT
--     The five indexes explicitly configured in
--     AutoServiceDbContext.QuotesModel.cs must exist. IX_quotes_QuoteNumber
--     is the natural-key unique index; the other four are non-unique
--     lookup indexes.
--     Expected: 0 rows.
-- ------------------------------------------------------------
WITH expected_indexes (table_name, index_name, expected_unique) AS (
    VALUES
        ('quotes',     'IX_quotes_QuoteNumber', TRUE),
        ('quotes',     'IX_quotes_VehicleId',   FALSE),
        ('quotes',     'IX_quotes_Status',      FALSE),
        ('quotes',     'IX_quotes_CreatedAt',   FALSE),
        ('quotelines', 'IX_quotelines_QuoteId', FALSE)
)
SELECT e.table_name,
       e.index_name,
       e.expected_unique,
       i.indisunique
FROM expected_indexes e
LEFT JOIN pg_class ic ON ic.relname = e.index_name
LEFT JOIN pg_index i ON i.indexrelid = ic.oid
LEFT JOIN pg_class t ON t.oid = i.indrelid AND t.relname = e.table_name
WHERE t.relname IS NULL
   OR i.indisunique IS DISTINCT FROM e.expected_unique
ORDER BY e.table_name, e.index_name;


-- ------------------------------------------------------------
-- 26. QUOTE OPTIMISTIC-CONCURRENCY MAPPING (NO PHYSICAL XMIN COLUMN)
--     Quote.Version maps onto the Postgres system column xmin
--     (AutoServiceDbContext.QuotesModel.cs: IsRowVersion().HasColumnName("xmin")),
--     which Npgsql adds no migration for and creates no user column for.
--     A future migration that accidentally materializes xmin as a real
--     column on quotes would collide with the system column; this stays
--     at zero as long as it does not.
--     Expected: physical_xmin_columns = 0.
-- ------------------------------------------------------------
SELECT COUNT(*) AS physical_xmin_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'quotes'
  AND column_name = 'xmin';
