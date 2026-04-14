-- 8. ADMIN ROLE ASSIGNMENT ASSERTION
--    Expected: 1
-- ------------------------------------------------------------
SELECT COUNT(*) AS admin_role_assignment_count
FROM "AspNetUsers" u
JOIN "AspNetUserRoles" ur ON ur."UserId" = u."Id"
JOIN "AspNetRoles" r ON r."Id" = ur."RoleId"
WHERE r."Name" = 'Admin';
