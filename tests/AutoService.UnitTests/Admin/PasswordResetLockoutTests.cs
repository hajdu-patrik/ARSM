using AutoService.ApiService.Admin;
using AutoService.ApiService.Data;
using AutoService.UnitTests.Data;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.Admin;

/** The reset unit clears the Identity lockout and the failed-attempt count before it touches the database (K3). */
public sealed class PasswordResetLockoutTests
{
    private sealed class MinimalStore : IUserStore<IdentityUser>
    {
        public void Dispose()
        {
        }

        public Task<string> GetUserIdAsync(IdentityUser user, CancellationToken cancellationToken) => Task.FromResult(user.Id);

        public Task<string?> GetUserNameAsync(IdentityUser user, CancellationToken cancellationToken) => Task.FromResult(user.UserName);

        public Task SetUserNameAsync(IdentityUser user, string? userName, CancellationToken cancellationToken) => Task.CompletedTask;

        public Task<string?> GetNormalizedUserNameAsync(IdentityUser user, CancellationToken cancellationToken)
            => Task.FromResult(user.NormalizedUserName);

        public Task SetNormalizedUserNameAsync(IdentityUser user, string? normalizedName, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<IdentityResult> CreateAsync(IdentityUser user, CancellationToken cancellationToken) => Task.FromResult(IdentityResult.Success);

        public Task<IdentityResult> UpdateAsync(IdentityUser user, CancellationToken cancellationToken) => Task.FromResult(IdentityResult.Success);

        public Task<IdentityResult> DeleteAsync(IdentityUser user, CancellationToken cancellationToken) => Task.FromResult(IdentityResult.Success);

        public Task<IdentityUser?> FindByIdAsync(string userId, CancellationToken cancellationToken) => Task.FromResult<IdentityUser?>(null);

        public Task<IdentityUser?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken)
            => Task.FromResult<IdentityUser?>(null);
    }

    /** Records the lockout calls in order; the user is found unless it is set to null. */
    private sealed class RecordingUserManager(IdentityUser? user, IdentityResult lockoutResult, IdentityResult? countResult = null)
        : UserManager<IdentityUser>(new MinimalStore(), null!, null!, null!, null!, null!, null!, null!, NullLogger<UserManager<IdentityUser>>.Instance)
    {
        public List<string> Calls { get; } = [];

        public override Task<IdentityUser?> FindByIdAsync(string userId) => Task.FromResult(user);

        public override Task<IdentityResult> SetLockoutEndDateAsync(IdentityUser user, DateTimeOffset? lockoutEnd)
        {
            Calls.Add(lockoutEnd is null ? "lockout cleared" : "lockout set");
            return Task.FromResult(lockoutResult);
        }

        public override Task<IdentityResult> ResetAccessFailedCountAsync(IdentityUser user)
        {
            Calls.Add("failed count reset");
            return Task.FromResult(countResult ?? IdentityResult.Success);
        }
    }

    private static Task<IdentityResult> RunUnit(RecordingUserManager userManager, AutoServiceDbContext db) =>
        PrivateStatic.Call<Task<IdentityResult>>(
            typeof(AdminEndpoints), "SaveResetRevocationAsync", 5, "identity-5", DateTime.UtcNow, userManager, db, null, CancellationToken.None);

    [Fact]
    public async Task The_lockout_and_the_failed_count_are_cleared_before_the_database_is_reached()
    {
        var userManager = new RecordingUserManager(new IdentityUser("mechanic"), IdentityResult.Success);
        await using var db = TestDbContextFactory.Create(new DatabaseReachedInterceptor());

        var reachedDatabase = await DatabaseReachedInterceptor.ReachesDatabaseAsync(() => RunUnit(userManager, db));

        Assert.True(reachedDatabase);
        Assert.Equal(["lockout cleared", "failed count reset"], userManager.Calls);
    }

    [Fact]
    public async Task A_failed_lockout_clear_is_returned_and_nothing_else_runs()
    {
        var failed = IdentityResult.Failed(new IdentityError { Code = "Boom", Description = "lockout store failed" });
        var userManager = new RecordingUserManager(new IdentityUser("mechanic"), failed);
        await using var db = TestDbContextFactory.Create(new DatabaseReachedInterceptor());

        var result = await RunUnit(userManager, db);

        Assert.False(result.Succeeded);
        Assert.Equal("Boom", Assert.Single(result.Errors).Code);
        Assert.Equal(["lockout cleared"], userManager.Calls);
    }

    [Fact]
    public async Task A_missing_identity_account_fails_the_unit_before_any_write()
    {
        var userManager = new RecordingUserManager(user: null, IdentityResult.Success);
        await using var db = TestDbContextFactory.Create(new DatabaseReachedInterceptor());

        var result = await RunUnit(userManager, db);

        Assert.Equal("UserNotFound", Assert.Single(result.Errors).Code);
        Assert.Empty(userManager.Calls);
    }

    [Fact]
    public async Task A_failed_count_reset_is_returned_before_the_database_is_reached()
    {
        var failed = IdentityResult.Failed(new IdentityError { Code = "CountBoom", Description = "count store failed" });
        var userManager = new RecordingUserManager(new IdentityUser("mechanic"), IdentityResult.Success, failed);
        await using var db = TestDbContextFactory.Create(new DatabaseReachedInterceptor());

        IdentityResult? result = null;
        var reachedDatabase = await DatabaseReachedInterceptor.ReachesDatabaseAsync(async () => result = await RunUnit(userManager, db));

        Assert.False(reachedDatabase);
        Assert.Equal("CountBoom", Assert.Single(result!.Errors).Code);
        Assert.Equal(["lockout cleared", "failed count reset"], userManager.Calls);
    }
}
