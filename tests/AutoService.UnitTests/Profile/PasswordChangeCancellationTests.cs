using AutoService.ApiService.Profile.Endpoints;
using AutoService.UnitTests.Data;
using AutoService.UnitTests.Http;
using AutoService.UnitTests.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using SignInResult = Microsoft.AspNetCore.Identity.SignInResult;

namespace AutoService.UnitTests.Profile;

/** A request aborted after the password changed still denylists the token and runs the revocation unit (F1). */
public sealed class PasswordChangeCancellationTests
{
    [Fact]
    public async Task An_abort_after_the_password_write_does_not_skip_the_denylist_or_the_revocation_unit()
    {
        using var aborted = new CancellationTokenSource();
        var events = new List<string>();
        var users = new ScriptedUserManager(new IdentityUser("mechanic") { Id = "identity-5" }, onPasswordWrite: aborted.Cancel);
        var denylist = new OrderRecordingDenylist(events);
        var unit = new ScriptedExecutionStrategy(failure: new DatabaseReachedException());
        await using var db = TestDbContextFactory.CreateWithStrategy(
            unit, new NoConnectionInterceptor(), new ScriptedRowsInterceptor(MechanicRows.Row(5, "identity-5")));
        var context = new DefaultHttpContext { User = SessionClaims.SignedIn(5, "jti-1") };
        var request = new ProfileEndpoints.ChangePasswordRequest("Old-Pass-1!", "New-Pass-2!", "New-Pass-2!");

        await Assert.ThrowsAsync<DatabaseReachedException>(() => PrivateStatic.Call<Task<IResult>>(
            typeof(ProfileEndpoints),
            "ChangePasswordAsync",
            request,
            context,
            users,
            new ScriptedSignInManager(users, SignInResult.Success),
            db,
            new FixedTokenIssuer(),
            denylist,
            new RecordingSessionRevocation(events),
            aborted.Token));

        Assert.True(aborted.IsCancellationRequested);
        Assert.Equal(["jti-1"], denylist.Revoked);
        Assert.False(denylist.Token.IsCancellationRequested);
        Assert.Equal(1, unit.Runs);
        Assert.False(unit.Token.IsCancellationRequested);
    }
}
