-- AI policy: use ai_agent_test_user for AI-assisted checks and run SELECT queries only.
-- Never run INSERT/UPDATE/DELETE/TRUNCATE/ALTER/CREATE/DROP/GRANT/REVOKE via AI SQL tooling.

-- 1. APPOINTMENT CLAIMS VERIFICATION
--    Shows which mechanic is assigned to which appointment.
--    Note: claim timestamp is not persisted; use ScheduledDate + inspected_at_utc.
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."ScheduledDate" AS scheduled_at_utc,
       am."MechanicId" AS claimed_by_mechanic_id,
       m."FirstName" || ' ' || m."LastName" AS claimed_by_mechanic_name,
       m."Email" AS claimed_by_mechanic_email,
       (NOW() AT TIME ZONE 'UTC') AS inspected_at_utc
FROM appointments a
LEFT JOIN appointmentmechanics am ON am."AppointmentId" = a."Id"
LEFT JOIN people m ON m."Id" = am."MechanicId"
ORDER BY a."Id", am."MechanicId";


-- ------------------------------------------------------------
-- 2. PROFILE UPDATE AUDIT (mechanics)
--    Verifies profile fields changed by /api/profile endpoints.
--    Includes firstName and lastName (updatable via PUT /api/profile).
-- ------------------------------------------------------------
SELECT "Id" AS mechanic_id,
       "Email",
       "PhoneNumber",
       "FirstName",
       "MiddleName",
       "LastName",
       ("ProfilePicture" IS NOT NULL) AS has_profile_picture
FROM people
WHERE "PersonType" = 'Mechanic'
ORDER BY "Id";


-- ------------------------------------------------------------
-- 3. APPOINTMENT STATUS TIMESTAMP AUDIT
--    Verifies completedAt / canceledAt are set correctly after status updates.
--    Valid statuses: InProgress, Completed, Cancelled. "Scheduled" is no longer valid.
--    Expected invariants:
--      Completed  -> CompletedAt IS NOT NULL, CanceledAt IS NULL
--      Cancelled  -> CanceledAt IS NOT NULL,  CompletedAt IS NULL
--      InProgress -> both IS NULL
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."Status",
       a."CompletedAt",
       a."CanceledAt",
       CASE
           WHEN a."Status" = 'Completed'  AND a."CompletedAt" IS NULL THEN 'FAIL: missing CompletedAt'
           WHEN a."Status" = 'Completed'  AND a."CanceledAt"  IS NOT NULL THEN 'FAIL: spurious CanceledAt'
           WHEN a."Status" = 'Cancelled'  AND a."CanceledAt"  IS NULL THEN 'FAIL: missing CanceledAt'
           WHEN a."Status" = 'Cancelled'  AND a."CompletedAt" IS NOT NULL THEN 'FAIL: spurious CompletedAt'
           WHEN a."Status" = 'InProgress' AND (a."CompletedAt" IS NOT NULL OR a."CanceledAt" IS NOT NULL) THEN 'FAIL: unexpected timestamp'
           ELSE 'OK'
       END AS timestamp_integrity
FROM appointments a
ORDER BY a."Id";


-- ------------------------------------------------------------
-- 4. APPOINTMENT ASSIGNMENT INVARIANT (NO ZERO-MECHANIC APPOINTMENTS)
--    Verifies no appointment exists without at least one assigned mechanic.
--    Expected: 0 rows.
-- ------------------------------------------------------------
SELECT a."Id" AS appointment_id,
       a."ScheduledDate",
       a."Status",
       a."TaskDescription"
FROM appointments a
LEFT JOIN appointmentmechanics am ON am."AppointmentId" = a."Id"
GROUP BY a."Id", a."ScheduledDate", a."Status", a."TaskDescription"
HAVING COUNT(am."MechanicId") = 0
ORDER BY a."Id";


-- ------------------------------------------------------------
-- 5. PROFILE PICTURE STORAGE CHECK
--    Counts mechanics with and without stored profile pictures.
-- ------------------------------------------------------------
SELECT COUNT(*) FILTER (WHERE "ProfilePicture" IS NOT NULL) AS mechanics_with_profile_picture,
       COUNT(*) FILTER (WHERE "ProfilePicture" IS NULL) AS mechanics_without_profile_picture,
       COUNT(*) AS total_mechanics
FROM people
WHERE "PersonType" = 'Mechanic';


-- ------------------------------------------------------------
-- 6. REFRESH TOKEN SESSION ROTATION CHAIN
--    Shows TokenHash -> ReplacedByTokenHash links and broken chain flags.
-- ------------------------------------------------------------
SELECT rt."Id" AS token_id,
       rt."MechanicId",
       rt."TokenHash",
       rt."ReplacedByTokenHash",
       next_rt."Id" AS replacement_token_id,
       rt."CreatedAtUtc",
       rt."RevokedAtUtc",
       rt."ExpiresAtUtc",
       CASE
           WHEN rt."ReplacedByTokenHash" IS NULL THEN FALSE
           WHEN next_rt."Id" IS NULL THEN TRUE
           ELSE FALSE
       END AS has_broken_rotation_link
FROM refreshtokens rt
LEFT JOIN refreshtokens next_rt ON next_rt."TokenHash" = rt."ReplacedByTokenHash"
ORDER BY rt."MechanicId", rt."CreatedAtUtc";


-- ------------------------------------------------------------
-- 7. MECHANIC DELETION INTEGRITY
--    Verifies there are no orphaned rows after mechanic deletion.
--    Expected: 0 rows.
-- ------------------------------------------------------------
SELECT 'appointmentmechanics' AS source_table,
       am."MechanicId"::text AS dangling_reference
FROM appointmentmechanics am
LEFT JOIN people p ON p."Id" = am."MechanicId" AND p."PersonType" = 'Mechanic'
WHERE p."Id" IS NULL

UNION ALL

SELECT 'refreshtokens' AS source_table,
       rt."MechanicId"::text AS dangling_reference
FROM refreshtokens rt
LEFT JOIN people p ON p."Id" = rt."MechanicId" AND p."PersonType" = 'Mechanic'
WHERE p."Id" IS NULL

UNION ALL

SELECT 'AspNetUsers' AS source_table,
       u."Id" AS dangling_reference
FROM "AspNetUsers" u
LEFT JOIN people p ON p."IdentityUserId" = u."Id" AND p."PersonType" = 'Mechanic'
WHERE p."Id" IS NULL;


-- ------------------------------------------------------------
-- 8. ADMIN MECHANIC LIST CONSISTENCY
--    Cross-checks mechanics against Identity admin role membership and picture flag projection.
-- ------------------------------------------------------------
SELECT p."Id" AS mechanic_id,
       p."Email" AS mechanic_email,
       p."IdentityUserId" AS identity_user_id,
    ((p."ProfilePicture" IS NOT NULL) AND (p."ProfilePictureContentType" IS NOT NULL)) AS "HasProfilePicture",
       COALESCE(BOOL_OR(r."Name" = 'Admin'), FALSE) AS "IsAdmin"
FROM people p
LEFT JOIN "AspNetUsers" u ON u."Id" = p."IdentityUserId"
LEFT JOIN "AspNetUserRoles" ur ON ur."UserId" = u."Id"
LEFT JOIN "AspNetRoles" r ON r."Id" = ur."RoleId"
WHERE p."PersonType" = 'Mechanic'
GROUP BY p."Id", p."Email", p."IdentityUserId"
ORDER BY p."Id";
