using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using SignInResult = Microsoft.AspNetCore.Identity.SignInResult;

namespace AutoService.UnitTests.Security;

/** Identity store with no storage at all: the scripted manager answers every call itself. */
internal sealed class ScriptedUserStore : IUserStore<IdentityUser>
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

/** Finds the one scripted user (or none), is never an admin, and runs a side effect on every password write. */
internal sealed class ScriptedUserManager(IdentityUser? user, Action? onPasswordWrite = null)
    : UserManager<IdentityUser>(new ScriptedUserStore(), null!, null!, null!, null!, null!, null!, null!, NullLogger<UserManager<IdentityUser>>.Instance)
{
    public List<string> Calls { get; } = [];

    public override Task<IdentityUser?> FindByIdAsync(string userId) => Found(nameof(FindByIdAsync));

    public override Task<IdentityUser?> FindByEmailAsync(string email) => Found(nameof(FindByEmailAsync));

    public override Task<bool> IsInRoleAsync(IdentityUser user, string role) => Task.FromResult(false);

    public override Task<IList<string>> GetRolesAsync(IdentityUser user) => Task.FromResult<IList<string>>(new List<string>());

    public override Task<string> GeneratePasswordResetTokenAsync(IdentityUser user) => Task.FromResult("reset-token");

    public override Task<IdentityResult> ChangePasswordAsync(IdentityUser user, string currentPassword, string newPassword)
        => PasswordWritten(nameof(ChangePasswordAsync));

    public override Task<IdentityResult> ResetPasswordAsync(IdentityUser user, string token, string newPassword)
        => PasswordWritten(nameof(ResetPasswordAsync));

    private Task<IdentityUser?> Found(string call)
    {
        Calls.Add(call);
        return Task.FromResult(user);
    }

    private Task<IdentityResult> PasswordWritten(string call)
    {
        Calls.Add(call);
        onPasswordWrite?.Invoke();
        return Task.FromResult(IdentityResult.Success);
    }
}

/** A sign-in manager whose password check answers the scripted result. */
internal sealed class ScriptedSignInManager(UserManager<IdentityUser> users, SignInResult result) : SignInManager<IdentityUser>(
    users,
    new HttpContextAccessor(),
    new EmptyClaimsFactory(),
    Microsoft.Extensions.Options.Options.Create(new IdentityOptions()),
    NullLogger<SignInManager<IdentityUser>>.Instance,
    null!,
    null!)
{
    public override Task<SignInResult> CheckPasswordSignInAsync(IdentityUser user, string password, bool lockoutOnFailure)
        => Task.FromResult(result);

    private sealed class EmptyClaimsFactory : IUserClaimsPrincipalFactory<IdentityUser>
    {
        public Task<ClaimsPrincipal> CreateAsync(IdentityUser user) => Task.FromResult(new ClaimsPrincipal());
    }
}
