using AutoService.ApiService.Auth.Security;
using AutoService.UnitTests.Data;
using AutoService.UnitTests.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace AutoService.UnitTests.Auth;

/** Two parallel writes of one jti: the loser's unique violation means the token is already revoked, not a failure (D-2). */
public sealed class TokenDenylistRaceTests
{
    private static readonly DateTimeOffset InTheFuture = DateTimeOffset.UtcNow.AddHours(1);

    private static DbUpdateException SaveFailure(string sqlState) =>
        new("save failed", new PostgresException("duplicate key", "ERROR", "ERROR", sqlState));

    private static TokenDenylistService ServiceWhoseSaveFails(DbUpdateException failure)
    {
        var provider = new ServiceCollection()
            .AddScoped(_ => TestDbContextFactory.Create(
                new NoConnectionInterceptor(), new EmptyRowsInterceptor(), new ScriptedSaveInterceptor(failure)))
            .BuildServiceProvider();

        return new TokenDenylistService(provider.GetRequiredService<IServiceScopeFactory>(), new RecordingLogger<TokenDenylistService>());
    }

    [Fact]
    public async Task A_unique_violation_on_the_save_counts_as_already_revoked()
    {
        var service = ServiceWhoseSaveFails(SaveFailure(PostgresErrorCodes.UniqueViolation));

        await service.RevokeAsync("jti-1", InTheFuture);

        Assert.True(await service.IsRevokedAsync("jti-1"));
    }

    [Fact]
    public async Task Any_other_save_failure_still_reaches_the_caller()
    {
        var service = ServiceWhoseSaveFails(SaveFailure(PostgresErrorCodes.ForeignKeyViolation));

        await Assert.ThrowsAsync<DbUpdateException>(() => service.RevokeAsync("jti-1", InTheFuture));
    }
}
