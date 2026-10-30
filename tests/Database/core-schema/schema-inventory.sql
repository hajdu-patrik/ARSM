-- AutoService DB - applied migrations and public table inventory (ai_agent_test_user, SELECT only).
-- Assertion idiom: a violation makes the closing cast fail, so psql (ON_ERROR_STOP) exits non-zero.

-- 1. Every migration under Data/Migrations is recorded in __EFMigrationsHistory with a product version.
SELECT 'migrations_applied' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL migrations_applied: ', COUNT(*), ' missing, e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT e.migration_id AS detail
    FROM (VALUES
        ('20260306125943_InitialCreate'),
        ('20260313111229_AddIdentityAndIdentityUserId'),
        ('20260403074955_AddRefreshTokensAndCookieAuth'),
        ('20260406121928_AddProfilePicture'),
        ('20260409092934_AddAppointmentTimestamps'),
        ('20260409112830_BackfillDemoData'),
        ('20260409133356_AddAppointmentIntakeAndDueDateTime'),
        ('20260409200900_AddRevokedJwtTokenDenylist'),
        ('20260414100000_NormalizePhoneNumbersToE164'),
        ('20260426203329_PostSecurityPayloadHardening'),
        ('20260520181330_VehicleSchemaRefactor'),
        ('20260902183623_AddProfilePictureObjectStorageColumns'),
        ('20260904210929_DropProfilePictureBytes'),
        ('20260910192215_AddPricingCatalog'),
        ('20260913200917_AddQuotes'),
        ('20260926161120_AddTrigramSearchIndexes'),
        ('20261018183502_AddCompanyProfile'),
        ('20261022072956_AddPhoneIndexPasswordResetAndRowVersions'),
        ('20261023143721_QuoteAppointmentCascade'),
        ('20261029094053_AddPeopleTokensValidAfter')
    ) AS e (migration_id)
    LEFT JOIN "__EFMigrationsHistory" h ON h."MigrationId" = e.migration_id
    WHERE h."MigrationId" IS NULL
       OR btrim(COALESCE(h."ProductVersion", '')) = ''
) v;


-- 2. The public schema holds exactly the model's tables: a leftover legacy table or a missing one fails.
SELECT 'public_table_inventory' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL public_table_inventory: ', COUNT(*), ' mismatch(es), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT COALESCE(e.table_name, t.table_name)
           || CASE WHEN t.table_name IS NULL THEN ' is missing' ELSE ' is not part of the model' END AS detail
    FROM (VALUES
        ('AspNetRoleClaims'), ('AspNetRoles'), ('AspNetUserClaims'), ('AspNetUserLogins'),
        ('AspNetUserRoles'), ('AspNetUsers'), ('AspNetUserTokens'), ('__EFMigrationsHistory'),
        ('appointmentmechanics'), ('appointments'), ('companyprofiles'), ('labortypes'),
        ('parts'), ('people'), ('quotelines'), ('quotes'),
        ('refreshtokens'), ('revokedjwttokens'), ('vehicles')
    ) AS e (table_name)
    FULL JOIN (
        SELECT table_name::text AS table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
    ) t ON t.table_name = e.table_name
    WHERE e.table_name IS NULL
       OR t.table_name IS NULL
) v;

