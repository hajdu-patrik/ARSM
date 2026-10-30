-- AutoService DB - column contract of the ASP.NET Identity tables, refreshtokens and revokedjwttokens.
-- Assertion idiom: a violation makes the closing cast fail; kinds: int, vc (varchar), bool, tstz, text.

-- 1. Every modelled column exists with its exact type, length and nullability, and no other column exists.
--    refreshtokens keeps only hashes (TokenHash, ReplacedByTokenHash); there is no raw token column.
WITH expected (tbl, col, kind, len, nullable) AS (
    VALUES
        ('AspNetUsers', 'Id', 'text', NULL, 'NO'),
        ('AspNetUsers', 'UserName', 'vc', 256, 'YES'),
        ('AspNetUsers', 'NormalizedUserName', 'vc', 256, 'YES'),
        ('AspNetUsers', 'Email', 'vc', 256, 'YES'),
        ('AspNetUsers', 'NormalizedEmail', 'vc', 256, 'YES'),
        ('AspNetUsers', 'EmailConfirmed', 'bool', NULL, 'NO'),
        ('AspNetUsers', 'PasswordHash', 'text', NULL, 'YES'),
        ('AspNetUsers', 'SecurityStamp', 'text', NULL, 'YES'),
        ('AspNetUsers', 'ConcurrencyStamp', 'text', NULL, 'YES'),
        ('AspNetUsers', 'PhoneNumber', 'text', NULL, 'YES'),
        ('AspNetUsers', 'PhoneNumberConfirmed', 'bool', NULL, 'NO'),
        ('AspNetUsers', 'TwoFactorEnabled', 'bool', NULL, 'NO'),
        ('AspNetUsers', 'LockoutEnd', 'tstz', NULL, 'YES'),
        ('AspNetUsers', 'LockoutEnabled', 'bool', NULL, 'NO'),
        ('AspNetUsers', 'AccessFailedCount', 'int', NULL, 'NO'),
        ('AspNetRoles', 'Id', 'text', NULL, 'NO'),
        ('AspNetRoles', 'Name', 'vc', 256, 'YES'),
        ('AspNetRoles', 'NormalizedName', 'vc', 256, 'YES'),
        ('AspNetRoles', 'ConcurrencyStamp', 'text', NULL, 'YES'),
        ('AspNetUserRoles', 'UserId', 'text', NULL, 'NO'),
        ('AspNetUserRoles', 'RoleId', 'text', NULL, 'NO'),
        ('AspNetUserClaims', 'Id', 'int', NULL, 'NO'),
        ('AspNetUserClaims', 'UserId', 'text', NULL, 'NO'),
        ('AspNetUserClaims', 'ClaimType', 'text', NULL, 'YES'),
        ('AspNetUserClaims', 'ClaimValue', 'text', NULL, 'YES'),
        ('AspNetRoleClaims', 'Id', 'int', NULL, 'NO'),
        ('AspNetRoleClaims', 'RoleId', 'text', NULL, 'NO'),
        ('AspNetRoleClaims', 'ClaimType', 'text', NULL, 'YES'),
        ('AspNetRoleClaims', 'ClaimValue', 'text', NULL, 'YES'),
        ('AspNetUserLogins', 'LoginProvider', 'text', NULL, 'NO'),
        ('AspNetUserLogins', 'ProviderKey', 'text', NULL, 'NO'),
        ('AspNetUserLogins', 'ProviderDisplayName', 'text', NULL, 'YES'),
        ('AspNetUserLogins', 'UserId', 'text', NULL, 'NO'),
        ('AspNetUserTokens', 'UserId', 'text', NULL, 'NO'),
        ('AspNetUserTokens', 'LoginProvider', 'text', NULL, 'NO'),
        ('AspNetUserTokens', 'Name', 'text', NULL, 'NO'),
        ('AspNetUserTokens', 'Value', 'text', NULL, 'YES'),
        ('refreshtokens', 'Id', 'int', NULL, 'NO'),
        ('refreshtokens', 'MechanicId', 'int', NULL, 'NO'),
        ('refreshtokens', 'TokenHash', 'vc', 128, 'NO'),
        ('refreshtokens', 'CreatedAtUtc', 'tstz', NULL, 'NO'),
        ('refreshtokens', 'ExpiresAtUtc', 'tstz', NULL, 'NO'),
        ('refreshtokens', 'RevokedAtUtc', 'tstz', NULL, 'YES'),
        ('refreshtokens', 'ReplacedByTokenHash', 'text', NULL, 'YES'),
        ('refreshtokens', 'CreatedByIpAddress', 'vc', 64, 'YES'),
        ('refreshtokens', 'CreatedByUserAgent', 'vc', 512, 'YES'),
        ('revokedjwttokens', 'Id', 'int', NULL, 'NO'),
        ('revokedjwttokens', 'JwtId', 'vc', 64, 'NO'),
        ('revokedjwttokens', 'RevokedAtUtc', 'tstz', NULL, 'NO'),
        ('revokedjwttokens', 'ExpiresAtUtc', 'tstz', NULL, 'NO')
),
actual AS (
    SELECT c.table_name::text AS tbl,
           c.column_name::text AS col,
           c.data_type::text AS data_type,
           c.character_maximum_length AS len,
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
              WHEN 'bool' THEN 'boolean'
              WHEN 'tstz' THEN 'timestamp with time zone'
              ELSE 'text' END
       OR a.len IS DISTINCT FROM e.len
       OR a.nullable <> e.nullable
    UNION ALL
    SELECT a.tbl || '.' || a.col || ' is not part of the model'
    FROM actual a
    LEFT JOIN expected e ON e.tbl = a.tbl AND e.col = a.col
    WHERE e.col IS NULL
)
SELECT 'identity_and_token_columns' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL identity_and_token_columns: ', COUNT(*), ' mismatch(es), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM violations v;
