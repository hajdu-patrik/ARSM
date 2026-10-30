-- AutoService DB - privileges of the DML-only login role arsm_app that AppRoleProvisioner creates (migration job).
-- Assertion idiom: a violation makes the closing cast fail; a database without the role passes (nothing provisioned).

-- 1. When arsm_app exists it can log in but is no superuser/creator, owns no table, has DML on every public
--    table and USAGE/SELECT/UPDATE on every sequence, and holds no TRUNCATE, REFERENCES or TRIGGER right.
SELECT 'app_role_privileges' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL app_role_privileges: ', COUNT(*), ' violation(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT 'role flags are not login-only' AS detail
    FROM pg_roles r
    WHERE r.rolname = 'arsm_app'
      AND (NOT r.rolcanlogin OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole)

    UNION ALL

    SELECT 'no CONNECT on ' || current_database()
    FROM pg_roles r
    WHERE r.rolname = 'arsm_app'
      AND NOT has_database_privilege(r.oid, current_database()::text, 'CONNECT')

    UNION ALL

    SELECT 'no USAGE on schema public'
    FROM pg_roles r
    WHERE r.rolname = 'arsm_app'
      AND NOT has_schema_privilege(r.oid, 'public'::text, 'USAGE')

    UNION ALL

    SELECT 'table ' || c.relname || ' lacks SELECT/INSERT/UPDATE/DELETE or grants a DDL-like right'
    FROM pg_roles r
    CROSS JOIN pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    WHERE r.rolname = 'arsm_app'
      AND c.relkind = 'r'
      AND NOT (has_table_privilege(r.oid, c.oid, 'SELECT')
               AND has_table_privilege(r.oid, c.oid, 'INSERT')
               AND has_table_privilege(r.oid, c.oid, 'UPDATE')
               AND has_table_privilege(r.oid, c.oid, 'DELETE'))

    UNION ALL

    SELECT 'table ' || c.relname || ' grants TRUNCATE, REFERENCES or TRIGGER'
    FROM pg_roles r
    CROSS JOIN pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    WHERE r.rolname = 'arsm_app'
      AND c.relkind = 'r'
      AND (has_table_privilege(r.oid, c.oid, 'TRUNCATE')
           OR has_table_privilege(r.oid, c.oid, 'REFERENCES')
           OR has_table_privilege(r.oid, c.oid, 'TRIGGER'))

    UNION ALL

    SELECT 'table ' || c.relname || ' is owned by the application role'
    FROM pg_roles r
    JOIN pg_class c ON c.relowner = r.oid AND c.relkind = 'r'
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    WHERE r.rolname = 'arsm_app'

    UNION ALL

    SELECT 'sequence ' || c.relname || ' lacks USAGE, SELECT or UPDATE'
    FROM pg_roles r
    CROSS JOIN pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    WHERE r.rolname = 'arsm_app'
      AND c.relkind = 'S'
      AND NOT (has_sequence_privilege(r.oid, c.oid, 'USAGE')
               AND has_sequence_privilege(r.oid, c.oid, 'SELECT')
               AND has_sequence_privilege(r.oid, c.oid, 'UPDATE'))
) v;
