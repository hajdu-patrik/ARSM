using System.Security.Claims;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Security;
using AutoService.ApiService.Storage;
using Microsoft.AspNetCore.Identity;

namespace AutoService.UnitTests.Security;

/** Claims of a signed-in mechanic request: person id, jti and an expiry an hour ahead. */
internal static class SessionClaims
{
    internal static ClaimsPrincipal SignedIn(int personId, string jwtId) => new(new ClaimsIdentity(
        [
            new Claim(PersonIdClaim.Type, personId.ToString()),
            new Claim("jti", jwtId),
            new Claim("exp", DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds().ToString()),
        ],
        "test"));
}

/** Notes the revocation calls in the shared event log; staging a cutoff just reads the clock. */
internal sealed class RecordingSessionRevocation(List<string> events) : ISessionRevocationService
{
    public DateTime StageCutoff(People person) => DateTime.UtcNow;

    public void ApplyRevocation(int personId, DateTime cutoffUtc) => events.Add("ApplyRevocation");

    public void RevokeAll(int personId) => events.Add("RevokeAll");

    public void Seed(int personId, DateTime cutoffUtc)
    {
    }

    public bool IsRevoked(int personId, DateTimeOffset issuedAt) => false;

    public DateTime IssueTimeUtc(int personId, DateTime nowUtc, DateTime? rowCutoffUtc = null) => nowUtc;
}

/** Logs the denylist write with the token it ran under and can fail like a broken database. */
internal sealed class OrderRecordingDenylist(List<string> events, Exception? failure = null) : ITokenDenylistService
{
    public List<string> Revoked { get; } = [];

    public CancellationToken Token { get; private set; }

    public Task RevokeAsync(string jwtId, DateTimeOffset expiresAtUtc, CancellationToken cancellationToken = default)
    {
        events.Add("Denylist");
        Revoked.Add(jwtId);
        Token = cancellationToken;
        return failure is null ? Task.CompletedTask : Task.FromException(failure);
    }

    public Task<bool> IsRevokedAsync(string jwtId, CancellationToken cancellationToken = default) => Task.FromResult(false);
}

/** Issues a fixed token string, so the handler's token claims are not under test. */
internal sealed class FixedTokenIssuer : IJwtTokenIssuer
{
    public string CreateToken(IdentityUser identityUser, People person, IEnumerable<string> roles, DateTime expiresAtUtc) => "access-token";
}

/** Logs a picture delete in the shared event log; nothing else is ever stored. */
internal sealed class OrderRecordingStorage(List<string> events) : IProfilePictureStorage
{
    public Task DeleteAsync(string objectKey, CancellationToken cancellationToken)
    {
        events.Add("PictureDelete");
        return Task.CompletedTask;
    }

    public Task<string> SaveAsync(int personId, byte[] content, string contentType, CancellationToken cancellationToken)
        => throw new NotSupportedException();

    public Task<Stream?> OpenReadAsync(string objectKey, CancellationToken cancellationToken) => throw new NotSupportedException();

    public Task<long?> GetObjectSizeAsync(string objectKey, CancellationToken cancellationToken) => throw new NotSupportedException();
}
