-- AutoService DB - parts and labor types: keys stored trimmed upper-case, names trimmed (CatalogItemHandlers.Normalize).
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. PartNumber and Code are non-blank, trimmed and free of lower-case ASCII letters; Name is non-blank and trimmed.
SELECT 'catalog_keys_and_names_normalized' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL catalog_keys_and_names_normalized: ', COUNT(*), ' row(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT 'part ' || pt."Id" AS detail
    FROM parts pt
    WHERE btrim(pt."PartNumber") = ''
       OR pt."PartNumber" <> btrim(pt."PartNumber")
       OR pt."PartNumber" ~ '[a-z]'
       OR btrim(pt."Name") = ''
       OR pt."Name" <> btrim(pt."Name")

    UNION ALL

    SELECT 'labor type ' || lt."Id"
    FROM labortypes lt
    WHERE btrim(lt."Code") = ''
       OR lt."Code" <> btrim(lt."Code")
       OR lt."Code" ~ '[a-z]'
       OR btrim(lt."Name") = ''
       OR lt."Name" <> btrim(lt."Name")
) v;

