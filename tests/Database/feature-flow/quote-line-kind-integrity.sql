-- ------------------------------------------------------------
-- FEATURE FLOW - QUOTE LINE KIND INTEGRITY
-- ------------------------------------------------------------
-- Verifies every persisted quotelines row obeys the Part/Labor exclusivity
-- rule from CK_QuoteLines_LineKindIntegrity
-- (AutoServiceDbContext.QuotesModel.cs): a Part-kind line may not carry a
-- LaborTypeId, and a Labor-kind line may not carry a PartId. PartId and
-- LaborTypeId are each individually optional (QuoteLine.cs: a manually
-- entered line needs no catalog reference on its own matching side), so
-- only a reference on the wrong side is a violation, not a missing
-- reference on the matching side.
-- Expected result: 0 rows.
-- AI policy: use ai_agent_test_user and run SELECT queries only.
-- ------------------------------------------------------------
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
