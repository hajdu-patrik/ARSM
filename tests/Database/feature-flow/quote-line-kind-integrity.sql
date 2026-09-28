-- FEATURE FLOW - QUOTE LINE KIND INTEGRITY — CK_QuoteLines_LineKindIntegrity: Part lines can't carry
--     LaborTypeId, Labor lines can't carry PartId; a missing (not wrong-side) reference is fine. Expected: 0 rows.
SELECT l."Id" AS quote_line_id,
       l."QuoteId",
       l."LineKind",
       l."PartId",
       l."LaborTypeId",
       CASE
           WHEN l."LineKind" = 'Part' AND l."LaborTypeId" IS NOT NULL THEN 'FAIL: Part line carries a LaborTypeId'
           WHEN l."LineKind" = 'Labor' AND l."PartId" IS NOT NULL THEN 'FAIL: Labor line carries a PartId'
           WHEN l."LineKind" NOT IN ('Part', 'Labor') THEN 'FAIL: LineKind is not a recognized value'
           ELSE 'OK'
       END AS line_kind_integrity
FROM quotelines l
WHERE (l."LineKind" = 'Part' AND l."LaborTypeId" IS NOT NULL)
   OR (l."LineKind" = 'Labor' AND l."PartId" IS NOT NULL)
   OR l."LineKind" NOT IN ('Part', 'Labor')
ORDER BY l."Id";
