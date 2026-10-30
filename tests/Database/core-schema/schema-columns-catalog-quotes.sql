-- AutoService DB - column contract of parts, labortypes, quotes, quotelines (money columns are numeric(18,2)).
-- Assertion idiom: a violation makes the closing cast fail; kinds: int, vc (varchar), tstz, num (18,2).

-- 1. Every modelled column exists with its exact type, length, precision and nullability, and no other
--    column exists (Version maps onto xmin, so a physical xmin column on these four tables fails here).
WITH expected (tbl, col, kind, len, nullable) AS (
    VALUES
        ('parts', 'Id', 'int', NULL, 'NO'),
        ('parts', 'PartNumber', 'vc', 40, 'NO'),
        ('parts', 'Name', 'vc', 120, 'NO'),
        ('parts', 'NetUnitPrice', 'num', NULL, 'NO'),
        ('parts', 'VatRatePercent', 'int', NULL, 'NO'),
        ('labortypes', 'Id', 'int', NULL, 'NO'),
        ('labortypes', 'Code', 'vc', 40, 'NO'),
        ('labortypes', 'Name', 'vc', 120, 'NO'),
        ('labortypes', 'HourlyNetRate', 'num', NULL, 'NO'),
        ('labortypes', 'VatRatePercent', 'int', NULL, 'NO'),
        ('quotes', 'Id', 'int', NULL, 'NO'),
        ('quotes', 'QuoteNumber', 'vc', 20, 'NO'),
        ('quotes', 'Title', 'vc', 120, 'NO'),
        ('quotes', 'Notes', 'vc', 1000, 'YES'),
        ('quotes', 'Status', 'vc', 16, 'NO'),
        ('quotes', 'CreatedAt', 'tstz', NULL, 'NO'),
        ('quotes', 'ValidUntil', 'tstz', NULL, 'NO'),
        ('quotes', 'SentAt', 'tstz', NULL, 'YES'),
        ('quotes', 'DecidedAt', 'tstz', NULL, 'YES'),
        ('quotes', 'VehicleId', 'int', NULL, 'NO'),
        ('quotes', 'AppointmentId', 'int', NULL, 'YES'),
        ('quotes', 'CreatedByMechanicId', 'int', NULL, 'YES'),
        ('quotes', 'TotalNet', 'num', NULL, 'NO'),
        ('quotes', 'TotalVat', 'num', NULL, 'NO'),
        ('quotes', 'TotalGross', 'num', NULL, 'NO'),
        ('quotelines', 'Id', 'int', NULL, 'NO'),
        ('quotelines', 'QuoteId', 'int', NULL, 'NO'),
        ('quotelines', 'PartId', 'int', NULL, 'YES'),
        ('quotelines', 'LaborTypeId', 'int', NULL, 'YES'),
        ('quotelines', 'LineKind', 'vc', 16, 'NO'),
        ('quotelines', 'Description', 'vc', 120, 'NO'),
        ('quotelines', 'Quantity', 'num', NULL, 'NO'),
        ('quotelines', 'NetUnitPrice', 'num', NULL, 'NO'),
        ('quotelines', 'VatRatePercent', 'int', NULL, 'NO'),
        ('quotelines', 'NetAmount', 'num', NULL, 'NO'),
        ('quotelines', 'VatAmount', 'num', NULL, 'NO'),
        ('quotelines', 'GrossAmount', 'num', NULL, 'NO'),
        ('quotelines', 'SortOrder', 'int', NULL, 'NO')
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
SELECT 'catalog_quote_columns' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL catalog_quote_columns: ', COUNT(*), ' mismatch(es), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM violations v;
