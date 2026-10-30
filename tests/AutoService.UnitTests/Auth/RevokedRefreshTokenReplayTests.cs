using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Security;
using AutoService.UnitTests.Data;
using AutoService.UnitTests.Http;
using AutoService.UnitTests.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Logging;

namespace AutoService.UnitTests.Auth;

/** A revoked refresh token with no successor is refused with 401 at any age; the database branches stay with the HTTP suite. */
public sealed class RevokedRefreshTokenReplayTests
{
    private static readonly DateTime RevokedAt = new(2026, 10, 30, 12, 0, 0, DateTimeKind.Utc);

    private static RefreshToken RevokedToken(string? successorHash)
    {
        var token = new RefreshToken(7, "old-hash", RevokedAt.AddDays(-1), RevokedAt.AddDays(29), "ip-hash", "agent");
        token.Revoke(RevokedAt, successorHash);
        return token;
    }

    private static async Task<(IResult Result, RecordingLogger Logger)> ReplayAsync(RefreshToken token, DateTime nowUtc)
    {
        var logger = new RecordingLogger();
        await using var db = TestDbContextFactory.Create();
        var result = await PrivateStatic.Call<Task<IResult>>(
            typeof(AuthEndpoints), "HandleRevokedTokenAsync", token, nowUtc, "ip-hash", db, logger, CancellationToken.None);
        return (result, logger);
    }

    [Theory]
    [InlineData(5)]
    [InlineData(29)]
    [InlineData(31)]
    [InlineData(3600)]
    public async Task A_revoked_token_without_a_successor_answers_401_inside_and_after_the_30_second_window(int secondsLater)
    {
        var token = RevokedToken(successorHash: null);

        var (result, logger) = await ReplayAsync(token, RevokedAt.AddSeconds(secondsLater));

        Assert.IsType<UnauthorizedHttpResult>(result);
        var entry = Assert.Single(logger.Entries);
        Assert.Equal(LogLevel.Warning, entry.Level);
        Assert.Contains("token already revoked for mechanic 7", entry.Message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task A_blank_successor_hash_counts_as_no_successor(string successorHash)
    {
        var (result, logger) = await ReplayAsync(RevokedToken(successorHash), RevokedAt.AddSeconds(10));

        Assert.IsType<UnauthorizedHttpResult>(result);
        Assert.Contains("already revoked", Assert.Single(logger.Entries).Message);
    }

    [Fact]
    public async Task The_refused_replay_leaves_the_stored_revocation_untouched()
    {
        var token = RevokedToken(successorHash: null);

        await ReplayAsync(token, RevokedAt.AddHours(2));

        Assert.Equal(RevokedAt, token.RevokedAtUtc);
        Assert.Null(token.ReplacedByTokenHash);
    }
}
