-- AutoService DB - every secondary index of the public schema: uniqueness, access method, key columns, predicate.
-- Assertion idiom: a violation makes the closing cast fail; trigram expressions are checked in customer-search-trigram-contracts.sql.

-- 1. The index set is exactly the modelled one (primary keys excluded): a missing, extra, non-unique or
--    unfiltered index fails. IX_people_PhoneNumber is unique and filtered to rows that carry a number.
SELECT 'secondary_indexes' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL secondary_indexes: ', COUNT(*), ' mismatch(es), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT COALESCE(e.idx, a.idx) || ' on ' || COALESCE(e.tbl, a.tbl)
           || ' expected unique=' || COALESCE(e.uniq::text, 'none') || ' ' || COALESCE(e.method, '-') || ' (' || COALESCE(e.cols, '*') || ')'
           || ' got unique=' || COALESCE(a.uniq::text, 'none') || ' ' || COALESCE(a.method, '-') || ' (' || COALESCE(a.cols, '-') || ') ' || COALESCE(a.pred, '') AS detail
    FROM (VALUES
        ('IX_people_Email', 'people', TRUE, 'btree', 'Email', NULL),
        ('IX_people_IdentityUserId', 'people', TRUE, 'btree', 'IdentityUserId', NULL),
        ('IX_people_PhoneNumber', 'people', TRUE, 'btree', 'PhoneNumber', '"PhoneNumber" IS NOT NULL'),
        ('IX_people_FirstName_Trgm', 'people', FALSE, 'gin', NULL, NULL),
        ('IX_people_MiddleName_Trgm', 'people', FALSE, 'gin', NULL, NULL),
        ('IX_people_LastName_Trgm', 'people', FALSE, 'gin', NULL, NULL),
        ('IX_people_FirstName_LastName_Trgm', 'people', FALSE, 'gin', NULL, NULL),
        ('IX_people_FirstName_MiddleName_LastName_Trgm', 'people', FALSE, 'gin', NULL, NULL),
        ('IX_vehicles_CustomerId', 'vehicles', FALSE, 'btree', 'CustomerId', NULL),
        ('IX_vehicles_LicensePlate', 'vehicles', TRUE, 'btree', 'LicensePlate', NULL),
        ('IX_vehicles_Vin', 'vehicles', TRUE, 'btree', 'Vin', NULL),
        ('IX_vehicles_LicensePlate_Trgm', 'vehicles', FALSE, 'gin', NULL, NULL),
        ('IX_vehicles_LicensePlate_Compact_Trgm', 'vehicles', FALSE, 'gin', NULL, NULL),
        ('IX_appointments_ScheduledDate', 'appointments', FALSE, 'btree', 'ScheduledDate', NULL),
        ('IX_appointments_DueDateTime', 'appointments', FALSE, 'btree', 'DueDateTime', NULL),
        ('IX_appointments_VehicleId', 'appointments', FALSE, 'btree', 'VehicleId', NULL),
        ('IX_appointmentmechanics_MechanicId', 'appointmentmechanics', FALSE, 'btree', 'MechanicId', NULL),
        ('IX_refreshtokens_TokenHash', 'refreshtokens', TRUE, 'btree', 'TokenHash', NULL),
        ('IX_refreshtokens_MechanicId_ExpiresAtUtc', 'refreshtokens', FALSE, 'btree', 'MechanicId,ExpiresAtUtc', NULL),
        ('IX_revokedjwttokens_JwtId', 'revokedjwttokens', TRUE, 'btree', 'JwtId', NULL),
        ('IX_revokedjwttokens_ExpiresAtUtc', 'revokedjwttokens', FALSE, 'btree', 'ExpiresAtUtc', NULL),
        ('IX_parts_PartNumber', 'parts', TRUE, 'btree', 'PartNumber', NULL),
        ('IX_labortypes_Code', 'labortypes', TRUE, 'btree', 'Code', NULL),
        ('IX_quotes_QuoteNumber', 'quotes', TRUE, 'btree', 'QuoteNumber', NULL),
        ('IX_quotes_VehicleId', 'quotes', FALSE, 'btree', 'VehicleId', NULL),
        ('IX_quotes_AppointmentId', 'quotes', FALSE, 'btree', 'AppointmentId', NULL),
        ('IX_quotes_CreatedByMechanicId', 'quotes', FALSE, 'btree', 'CreatedByMechanicId', NULL),
        ('IX_quotes_Status', 'quotes', FALSE, 'btree', 'Status', NULL),
        ('IX_quotes_CreatedAt', 'quotes', FALSE, 'btree', 'CreatedAt', NULL),
        ('IX_quotelines_QuoteId', 'quotelines', FALSE, 'btree', 'QuoteId', NULL),
        ('IX_quotelines_PartId', 'quotelines', FALSE, 'btree', 'PartId', NULL),
        ('IX_quotelines_LaborTypeId', 'quotelines', FALSE, 'btree', 'LaborTypeId', NULL),
        ('RoleNameIndex', 'AspNetRoles', TRUE, 'btree', 'NormalizedName', NULL),
        ('IX_AspNetRoleClaims_RoleId', 'AspNetRoleClaims', FALSE, 'btree', 'RoleId', NULL),
        ('UserNameIndex', 'AspNetUsers', TRUE, 'btree', 'NormalizedUserName', NULL),
        ('EmailIndex', 'AspNetUsers', FALSE, 'btree', 'NormalizedEmail', NULL),
        ('IX_AspNetUserClaims_UserId', 'AspNetUserClaims', FALSE, 'btree', 'UserId', NULL),
        ('IX_AspNetUserLogins_UserId', 'AspNetUserLogins', FALSE, 'btree', 'UserId', NULL),
        ('IX_AspNetUserRoles_RoleId', 'AspNetUserRoles', FALSE, 'btree', 'RoleId', NULL)
    ) AS e (idx, tbl, uniq, method, cols, pred)
    FULL JOIN (
        SELECT ic.relname::text AS idx,
               t.relname::text AS tbl,
               i.indisunique AS uniq,
               am.amname::text AS method,
               (SELECT string_agg(replace(pg_get_indexdef(i.indexrelid, k, TRUE), '"', ''), ',' ORDER BY k)
                FROM generate_series(1, i.indnkeyatts::int) AS k) AS cols,
               pg_get_expr(i.indpred, i.indrelid) AS pred
        FROM pg_index i
        JOIN pg_class ic ON ic.oid = i.indexrelid
        JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = 'public'
        JOIN pg_am am ON am.oid = ic.relam
        WHERE NOT i.indisprimary
    ) a ON a.idx = e.idx
    WHERE e.idx IS NULL
       OR a.idx IS NULL
       OR a.tbl <> e.tbl
       OR a.uniq <> e.uniq
       OR a.method <> e.method
       OR (e.cols IS NOT NULL AND a.cols <> e.cols)
       OR (e.pred IS NULL AND a.pred IS NOT NULL)
       OR (e.pred IS NOT NULL AND COALESCE(a.pred, '') NOT LIKE '%' || e.pred || '%')
) v;
