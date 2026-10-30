-- AutoService DB - the single-row companyprofiles letterhead printed on every quote PDF.
-- Assertion idiom: a violation makes the closing cast fail; an empty table passes (the seed fills it at startup).

-- 1. The row is the pinned Id 1 (CK_CompanyProfiles_SingleRow + the primary key allow no other), and every field is
--    stored trimmed, non-blank and free of template markers, as the seed resolver and the PUT validator guarantee.
SELECT 'company_profile_fields' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL company_profile_fields: ', COUNT(*), ' row(s), e.g. id ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT cp."Id"::text AS detail
    FROM companyprofiles cp
    CROSS JOIN LATERAL (VALUES
        (cp."Name"), (cp."AddressLine"), (cp."PostalCode"), (cp."City"),
        (cp."TaxNumber"), (cp."PhoneNumber"), (cp."Email")
    ) AS f (val)
    WHERE btrim(f.val) = ''
       OR f.val <> btrim(f.val)
       OR strpos(upper(f.val), 'CHANGE_ME') > 0
       OR strpos(upper(f.val), 'SET_UNIQUE_LOCAL') > 0
    GROUP BY cp."Id"
) v;
