-- AutoService DB - named CHECK constraints: the set is exactly the modelled one and each keeps both bound fragments.
-- Assertion idiom: a violation makes the closing cast fail; NOT NULL constraints are not contype c and are ignored.

-- 1. Missing, extra or weakened constraint (a half-dropped bound, a VAT set without 0/5/18/27) fails.
--    CK_Quotes_Totals pins gross = net + vat; CK_Vehicles_Vin pins the 17-character VIN alphabet.
SELECT 'check_constraints' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL check_constraints: ', COUNT(*), ' mismatch(es), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT COALESCE(e.conname, a.conname) || ' on ' || COALESCE(e.tbl, a.tbl)
           || CASE WHEN a.conname IS NULL THEN ' is missing'
                   WHEN e.conname IS NULL THEN ' is not part of the model'
                   ELSE ' lost a fragment: ' || a.def END AS detail
    FROM (VALUES
        ('people', 'CK_Mechanics_Expertise_NotEmpty', '"Expertise"', '<> '''''),
        ('vehicles', 'CK_Vehicles_Year', '"Year" >= 1886', '"Year" <= 2100'),
        ('vehicles', 'CK_Vehicles_MileageKm', '"MileageKm" >= 0', '"MileageKm"'),
        ('vehicles', 'CK_Vehicles_EnginePowerKw', '"EnginePowerKw" >= 0', '"EnginePowerKw"'),
        ('vehicles', 'CK_Vehicles_Vin', '"Vin"', '^[A-HJ-NPR-Z0-9]{17}$'),
        ('parts', 'CK_Parts_NetUnitPrice', '>= (0)', '<= (100000000)'),
        ('parts', 'CK_Parts_VatRate', '0, 5', '18, 27'),
        ('labortypes', 'CK_LaborTypes_HourlyNetRate', '>= (0)', '<= (100000000)'),
        ('labortypes', 'CK_LaborTypes_VatRate', '0, 5', '18, 27'),
        ('quotes', 'CK_Quotes_Totals', '"TotalGross" = (', '"TotalNet" + "TotalVat"'),
        ('quotelines', 'CK_QuoteLines_Quantity', '> (0)', '<= (10000)'),
        ('quotelines', 'CK_QuoteLines_NetUnitPrice', '>= (0)', '<= (100000000)'),
        ('quotelines', 'CK_QuoteLines_VatRate', '0, 5', '18, 27'),
        ('quotelines', 'CK_QuoteLines_LineKindIntegrity', '''Part''::text) AND ("LaborTypeId" IS NULL)', '''Labor''::text) AND ("PartId" IS NULL)'),
        ('companyprofiles', 'CK_CompanyProfiles_SingleRow', '"Id" = 1', '"Id"')
    ) AS e (tbl, conname, frag1, frag2)
    FULL JOIN (
        SELECT t.relname::text AS tbl,
               c.conname::text AS conname,
               pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = 'public'
        WHERE c.contype = 'c'
    ) a ON a.conname = e.conname AND a.tbl = e.tbl
    WHERE e.conname IS NULL
       OR a.conname IS NULL
       OR position(e.frag1 IN a.def) = 0
       OR position(e.frag2 IN a.def) = 0
) v;
