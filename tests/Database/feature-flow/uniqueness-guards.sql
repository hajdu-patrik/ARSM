-- AutoService DB - business uniqueness stated independently of the unique indexes (which compare exact strings).
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. No two rows collide once case and surrounding whitespace are ignored: person e-mail, vehicle plate and VIN,
--    part number, labor code, quote number, Identity user name.
SELECT 'case_insensitive_uniqueness' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL case_insensitive_uniqueness: ', COUNT(*), ' key(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT 'people.Email ' || lower(btrim(p."Email")) AS detail
    FROM people p
    GROUP BY lower(btrim(p."Email"))
    HAVING COUNT(*) > 1

    UNION ALL

    SELECT 'vehicles.LicensePlate ' || upper(btrim(v."LicensePlate"))
    FROM vehicles v
    GROUP BY upper(btrim(v."LicensePlate"))
    HAVING COUNT(*) > 1

    UNION ALL

    SELECT 'vehicles.Vin ' || upper(btrim(v."Vin"))
    FROM vehicles v
    GROUP BY upper(btrim(v."Vin"))
    HAVING COUNT(*) > 1

    UNION ALL

    SELECT 'parts.PartNumber ' || upper(btrim(pt."PartNumber"))
    FROM parts pt
    GROUP BY upper(btrim(pt."PartNumber"))
    HAVING COUNT(*) > 1

    UNION ALL

    SELECT 'labortypes.Code ' || upper(btrim(lt."Code"))
    FROM labortypes lt
    GROUP BY upper(btrim(lt."Code"))
    HAVING COUNT(*) > 1

    UNION ALL

    SELECT 'quotes.QuoteNumber ' || upper(btrim(q."QuoteNumber"))
    FROM quotes q
    GROUP BY upper(btrim(q."QuoteNumber"))
    HAVING COUNT(*) > 1

    UNION ALL

    SELECT 'AspNetUsers.UserName ' || upper(btrim(u."UserName"))
    FROM "AspNetUsers" u
    GROUP BY upper(btrim(u."UserName"))
    HAVING COUNT(*) > 1
) v;

