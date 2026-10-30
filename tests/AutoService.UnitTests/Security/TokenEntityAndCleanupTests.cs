using AutoService.ApiService.Security;

namespace AutoService.UnitTests.Security;

/** The denylist and refresh-token entities' own rules, and the cleanup service's start and stop. */
public sealed class TokenEntityAndCleanupTests
{
    private static readonly DateTime Now = new(2026, 10, 30, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Extending_a_denylist_entry_only_moves_the_expiry_later()
    {
        var entry = new RevokedJwtToken("jti-1", Now, Now.AddMinutes(10));

        entry.ExtendExpiry(Now.AddMinutes(20));
        Assert.Equal(Now.AddMinutes(20), entry.ExpiresAtUtc);

        entry.ExtendExpiry(Now.AddMinutes(5));
        Assert.Equal(Now.AddMinutes(20), entry.ExpiresAtUtc);

        entry.ExtendExpiry(Now.AddMinutes(20));
        Assert.Equal(Now.AddMinutes(20), entry.ExpiresAtUtc);
    }

    [Fact]
    public void A_new_denylist_entry_keeps_what_it_was_given()
    {
        var entry = new RevokedJwtToken("jti-1", Now, Now.AddMinutes(10));

        Assert.Equal("jti-1", entry.JwtId);
        Assert.Equal(Now, entry.RevokedAtUtc);
        Assert.Equal(Now.AddMinutes(10), entry.ExpiresAtUtc);
    }

    [Fact]
    public void A_new_refresh_token_is_not_revoked_and_keeps_its_binding()
    {
        var token = new RefreshToken(7, "hash-1", Now, Now.AddDays(7), "sha256:ABC", "agent");

        Assert.Equal(7, token.MechanicId);
        Assert.Equal("hash-1", token.TokenHash);
        Assert.Equal(Now.AddDays(7), token.ExpiresAtUtc);
        Assert.Equal("sha256:ABC", token.CreatedByIpAddress);
        Assert.Equal("agent", token.CreatedByUserAgent);
        Assert.Null(token.RevokedAtUtc);
        Assert.Null(token.ReplacedByTokenHash);
    }

    [Fact]
    public void Revoking_a_refresh_token_stamps_the_time_and_the_optional_replacement()
    {
        var plain = new RefreshToken(7, "hash-1", Now, Now.AddDays(7), null, null);
        var rotated = new RefreshToken(7, "hash-2", Now, Now.AddDays(7), null, null);

        plain.Revoke(Now.AddMinutes(1));
        rotated.Revoke(Now.AddMinutes(2), "hash-3");

        Assert.Equal(Now.AddMinutes(1), plain.RevokedAtUtc);
        Assert.Null(plain.ReplacedByTokenHash);
        Assert.Equal(Now.AddMinutes(2), rotated.RevokedAtUtc);
        Assert.Equal("hash-3", rotated.ReplacedByTokenHash);
    }

    [Fact]
    public async Task The_cleanup_service_waits_an_interval_before_its_first_run_and_stops_cleanly()
    {
        var scopes = new ThrowingScopeFactory(new InvalidOperationException("must not run yet"));
        var log = new RecordingLogger<ExpiredTokenCleanupService>();
        using var service = new ExpiredTokenCleanupService(scopes, log);

        await service.StartAsync(CancellationToken.None);
        await service.StopAsync(CancellationToken.None);

        Assert.True(service.ExecuteTask!.IsCompleted);
        Assert.False(service.ExecuteTask.IsFaulted);
        Assert.Equal(0, scopes.Created);
        Assert.Empty(log.Entries);
    }
}
