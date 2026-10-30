using AutoService.ApiService.Auth.Security;
using AutoService.UnitTests.Security;
using Microsoft.Extensions.Logging;

namespace AutoService.UnitTests.Auth;

/** The denylist's in-memory side and its failure handling; the database reads and writes are the HTTP suites' job. */
public sealed class TokenDenylistServiceTests
{
    private static readonly DateTimeOffset InTheFuture = DateTimeOffset.UtcNow.AddHours(1);

    private static (TokenDenylistService Service, ThrowingScopeFactory Scopes, RecordingLogger<TokenDenylistService> Log) Create()
    {
        var scopes = new ThrowingScopeFactory(new InvalidOperationException("no database in this test"));
        var log = new RecordingLogger<TokenDenylistService>();
        return (new TokenDenylistService(scopes, log), scopes, log);
    }

    [Fact]
    public async Task Revoking_a_token_that_has_already_expired_does_nothing()
    {
        var (service, scopes, _) = Create();

        await service.RevokeAsync("jti-1", DateTimeOffset.UtcNow.AddSeconds(-1));

        Assert.Equal(0, scopes.Created);
    }

    [Fact]
    public async Task A_revoked_jti_is_known_from_memory_even_when_the_database_write_fails()
    {
        var (service, scopes, _) = Create();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.RevokeAsync("jti-1", InTheFuture));
        var revoked = await service.IsRevokedAsync("jti-1");

        Assert.True(revoked);
        Assert.Equal(1, scopes.Created);
    }

    [Fact]
    public async Task An_unknown_jti_falls_back_to_the_database_while_the_denylist_is_not_warmed()
    {
        var (service, scopes, _) = Create();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.IsRevokedAsync("never-seen"));

        Assert.Equal(1, scopes.Created);
    }

    [Fact]
    public async Task A_failed_warm_up_is_logged_and_does_not_stop_startup()
    {
        var (service, scopes, log) = Create();

        await service.StartAsync(CancellationToken.None);

        var entry = Assert.Single(log.Entries);
        Assert.Equal(LogLevel.Error, entry.Level);
        Assert.Equal("Token denylist warm-up failed; falling back to database lookups.", entry.Message);
        Assert.IsType<InvalidOperationException>(entry.Exception);
        Assert.Equal(1, scopes.Created);
    }

    [Fact]
    public async Task A_failed_warm_up_keeps_the_per_request_database_fallback_on()
    {
        var (service, scopes, _) = Create();
        await service.StartAsync(CancellationToken.None);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.IsRevokedAsync("jti-1"));

        Assert.Equal(2, scopes.Created);
    }

    [Fact]
    public async Task A_cancelled_warm_up_is_not_swallowed()
    {
        var scopes = new ThrowingScopeFactory(new OperationCanceledException());
        var service = new TokenDenylistService(scopes, new RecordingLogger<TokenDenylistService>());

        await Assert.ThrowsAsync<OperationCanceledException>(() => service.StartAsync(CancellationToken.None));
    }

    [Fact]
    public async Task Stopping_needs_no_work()
    {
        var (service, scopes, _) = Create();

        await service.StopAsync(CancellationToken.None);

        Assert.Equal(0, scopes.Created);
    }
}
