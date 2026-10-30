-- AutoService DB - revokedjwttokens, the access-token denylist written on logout and session revocation.
-- Assertion idiom: a violation makes the closing cast fail; every check passes on an empty database.

-- 1. A denylisted jti is a non-blank identifier without surrounding whitespace (unique via IX_revokedjwttokens_JwtId).
SELECT 'jwt_denylist_jti_format' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL jwt_denylist_jti_format: ', COUNT(*), ' row(s), e.g. id ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT rjt."Id"::text AS detail
    FROM revokedjwttokens rjt
    WHERE btrim(rjt."JwtId") = ''
       OR rjt."JwtId" <> btrim(rjt."JwtId")
) v;


-- 2. TokenDenylistService never stores an already-expired token: the row's expiry lies after its revocation
--    (5 s of slack for the clock read between the expiry test and the insert).
SELECT 'jwt_denylist_expiry_after_revocation' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'ok'
            ELSE concat('FAIL jwt_denylist_expiry_after_revocation: ', COUNT(*), ' row(s), e.g. id ', MIN(v.detail))::int::text END AS check_result
FROM (
    SELECT rjt."Id"::text AS detail
    FROM revokedjwttokens rjt
    WHERE rjt."ExpiresAtUtc" < rjt."RevokedAtUtc" - interval '5 seconds'
) v;
