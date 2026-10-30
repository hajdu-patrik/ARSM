using System.Security.Claims;
using System.Text.Json;
using AutoService.ApiService.Auth.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using SignInResult = Microsoft.AspNetCore.Identity.SignInResult;

namespace AutoService.UnitTests.Auth;

/** Every failed check counts toward the lockout; only change-password and delete-profile see the lockout as a 429. */
public sealed class PasswordCheckTests
{
    private sealed class FakeUserStore : IUserStore<IdentityUser>
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

    private sealed class FakeUserManager()
        : UserManager<IdentityUser>(new FakeUserStore(), null!, null!, null!, null!, null!, null!, null!, NullLogger<UserManager<IdentityUser>>.Instance)
    {
        public DateTimeOffset? LockoutEnd { get; set; }

        public override Task<DateTimeOffset?> GetLockoutEndDateAsync(IdentityUser user) => Task.FromResult(LockoutEnd);
    }

    private sealed class FakeClaimsFactory : IUserClaimsPrincipalFactory<IdentityUser>
    {
        public Task<ClaimsPrincipal> CreateAsync(IdentityUser user) => Task.FromResult(new ClaimsPrincipal());
    }

    private sealed class FakeSignInManager(UserManager<IdentityUser> users, SignInResult result) : SignInManager<IdentityUser>(
        users,
        new HttpContextAccessor(),
        new FakeClaimsFactory(),
        Microsoft.Extensions.Options.Options.Create(new IdentityOptions()),
        NullLogger<SignInManager<IdentityUser>>.Instance,
        null!,
        null!)
    {
        public bool? LockoutOnFailure { get; private set; }

        public override Task<SignInResult> CheckPasswordSignInAsync(IdentityUser user, string password, bool lockoutOnFailure)
        {
            LockoutOnFailure = lockoutOnFailure;
            return Task.FromResult(result);
        }
    }

    private static readonly IdentityUser User = new() { Id = "identity-1" };

    [Fact]
    public async Task Login_check_counts_the_attempt_toward_the_lockout_and_passes_on_success()
    {
        var signIn = new FakeSignInManager(new FakeUserManager(), SignInResult.Success);

        Assert.True(await PasswordCheck.VerifyForLoginAsync(signIn, User, "pw"));
        Assert.True(signIn.LockoutOnFailure);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Login_check_treats_a_failure_and_a_lockout_alike_as_a_plain_failure(bool lockedOut)
    {
        var signIn = new FakeSignInManager(new FakeUserManager(), lockedOut ? SignInResult.LockedOut : SignInResult.Failed);

        Assert.False(await PasswordCheck.VerifyForLoginAsync(signIn, User, "pw"));
    }

    [Fact]
    public async Task A_correct_password_succeeds_with_no_lockout_result()
    {
        var users = new FakeUserManager();
        var signIn = new FakeSignInManager(users, SignInResult.Success);

        var (succeeded, lockout) = await PasswordCheck.VerifyAsync(signIn, users, User, "pw");

        Assert.True(succeeded);
        Assert.Null(lockout);
        Assert.True(signIn.LockoutOnFailure);
    }

    [Fact]
    public async Task A_wrong_password_fails_with_no_lockout_result_and_counts_toward_the_lockout()
    {
        var users = new FakeUserManager();
        var signIn = new FakeSignInManager(users, SignInResult.Failed);

        var (succeeded, lockout) = await PasswordCheck.VerifyAsync(signIn, users, User, "pw");

        Assert.False(succeeded);
        Assert.Null(lockout);
        Assert.True(signIn.LockoutOnFailure);
    }

    [Fact]
    public async Task A_locked_out_account_gets_a_429_with_the_seconds_left()
    {
        var users = new FakeUserManager { LockoutEnd = DateTimeOffset.UtcNow.AddSeconds(90) };
        var signIn = new FakeSignInManager(users, SignInResult.LockedOut);

        var (succeeded, lockout) = await PasswordCheck.VerifyAsync(signIn, users, User, "pw");

        Assert.False(succeeded);
        var (status, body) = Read(lockout!);
        Assert.Equal(StatusCodes.Status429TooManyRequests, status);
        Assert.Equal("lockout_active", body.GetProperty("code").GetString());
        Assert.Equal("Too many attempts. Try again later.", body.GetProperty("message").GetString());
        Assert.InRange(body.GetProperty("retryAfterSeconds").GetInt32(), 88, 91);
    }

    [Fact]
    public async Task A_lockout_without_an_end_date_falls_back_to_sixty_seconds()
    {
        var users = new FakeUserManager { LockoutEnd = null };

        var (_, lockout) = await PasswordCheck.VerifyAsync(new FakeSignInManager(users, SignInResult.LockedOut), users, User, "pw");

        Assert.Equal(60, Read(lockout!).Body.GetProperty("retryAfterSeconds").GetInt32());
    }

    [Fact]
    public async Task A_lockout_end_already_in_the_past_still_asks_for_at_least_one_second()
    {
        var users = new FakeUserManager { LockoutEnd = DateTimeOffset.UtcNow.AddSeconds(-30) };

        var (_, lockout) = await PasswordCheck.VerifyAsync(new FakeSignInManager(users, SignInResult.LockedOut), users, User, "pw");

        Assert.Equal(1, Read(lockout!).Body.GetProperty("retryAfterSeconds").GetInt32());
    }

    private static (int? Status, JsonElement Body) Read(IResult result)
    {
        var status = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result).StatusCode;
        var value = Assert.IsAssignableFrom<IValueHttpResult>(result).Value;
        return (status, JsonSerializer.SerializeToElement(value));
    }
}
