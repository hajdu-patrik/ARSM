-- AutoService DB - Identity roles: only the Admin role exists and a shop with mechanics always has an admin.
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. The role table holds only "Admin", stored with its upper-case normalized name (bootstrap matches on it).
SELECT 'identity_roles_known' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL identity_roles_known: ', COUNT(*), ' role(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT COALESCE(r."Name", '<null>') AS detail
    FROM "AspNetRoles" r
    WHERE r."Name" IS DISTINCT FROM 'Admin'
       OR r."NormalizedName" IS DISTINCT FROM 'ADMIN'
) v;


-- 2. Only mechanics hold roles: every role assignment belongs to an account that is linked to a mechanic row.
SELECT 'role_assignments_belong_to_mechanics' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL role_assignments_belong_to_mechanics: ', COUNT(*), ' assignment(s), e.g. ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT ur."UserId" AS detail
    FROM "AspNetUserRoles" ur
    LEFT JOIN people p ON p."IdentityUserId" = ur."UserId" AND p."PersonType" = 'Mechanic'
    WHERE p."Id" IS NULL
) v;


-- 3. Once any mechanic exists, at least one of them is an admin: admin accounts cannot be deleted and the last
--    mechanic cannot be removed, so an admin-less shop would lock everyone out of the admin routes.
SELECT 'admin_exists_when_mechanics_exist' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL admin_exists_when_mechanics_exist: ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT (SELECT COUNT(*) FROM people WHERE "PersonType" = 'Mechanic') || ' mechanic(s) but no admin' AS detail
    WHERE EXISTS (SELECT 1 FROM people WHERE "PersonType" = 'Mechanic')
      AND NOT EXISTS (
          SELECT 1
          FROM "AspNetUserRoles" ur
          JOIN "AspNetRoles" r ON r."Id" = ur."RoleId"
          WHERE r."Name" = 'Admin')
) v;
