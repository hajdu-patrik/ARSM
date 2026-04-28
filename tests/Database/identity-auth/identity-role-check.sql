-- 7. IDENTITY ROLE CHECK — Admin role assignment existence
--    Expected: at least one row with role 'Admin'
-- ------------------------------------------------------------
SELECT u."Email" AS identity_email,
       r."Name" AS role_name
FROM "AspNetUsers" u
JOIN "AspNetUserRoles" ur ON ur."UserId" = u."Id"
JOIN "AspNetRoles" r ON r."Id" = ur."RoleId"
ORDER BY u."Email", r."Name";


-- ------------------------------------------------------------
-- 8. ADMIN ROLE ASSIGNMENT COUNT
--    Consolidated assertion (moved from admin-role-assertion.sql).
--    Expected: at least 1
-- ------------------------------------------------------------
SELECT COUNT(*) AS admin_role_assignment_count
FROM "AspNetUsers" u
JOIN "AspNetUserRoles" ur ON ur."UserId" = u."Id"
JOIN "AspNetRoles" r ON r."Id" = ur."RoleId"
WHERE r."Name" = 'Admin';
