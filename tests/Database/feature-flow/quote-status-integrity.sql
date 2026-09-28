-- FEATURE FLOW - QUOTE STATUS LIFECYCLE INTEGRITY — an Accepted/Rejected quote (QuoteStatus.cs) must
--     already have SentAt; set by the Quotes handlers, not a DB constraint. Expected: 0 rows.
SELECT q."Id" AS quote_id,
       q."QuoteNumber",
       q."Status",
       q."SentAt",
       q."DecidedAt",
       CASE
           WHEN q."Status" IN ('Accepted', 'Rejected') AND q."SentAt" IS NULL THEN 'FAIL: decided quote missing SentAt'
           ELSE 'OK'
       END AS status_lifecycle_integrity
FROM quotes q
WHERE q."Status" IN ('Accepted', 'Rejected')
  AND q."SentAt" IS NULL
ORDER BY q."Id";
