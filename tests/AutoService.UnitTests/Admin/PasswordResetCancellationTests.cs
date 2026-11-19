using AutoService.ApiService.Admin;
using AutoService.UnitTests.Data;
using AutoService.UnitTests.Http;
using AutoService.UnitTests.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.Admin;

/** A request aborted after the password was reset still runs the revocation unit that ends the mechanic's sessions (F1). */
public sealed class PasswordResetCancellationTests
{
    [Fact]
    public async Task An_abort_after_the_password_reset_does_not_skip_the_revocation_unit()
    {
        using var aborted = new CancellationTokenSource();
        var users = new ScriptedUserManager(new IdentityUser("mechanic") { Id = "identity-7" }, onPasswordWrite: aborted.Cancel);
        var unit = new ScriptedExecutionStrategy(failure: new DatabaseReachedException());
        await using var db = TestDbContextFactory.CreateWithStrategy(
            unit, new NoConnectionInterceptor(), new ScriptedRowsInterceptor(MechanicRows.Row(7, "identity-7")));
        var context = new DefaultHttpContext { User = SessionClaims.SignedIn(1, "jti-admin") };

        await Assert.ThrowsAsync<DatabaseReachedException>(() => PrivateStatic.Call<Task<IResult>>(
            typeof(AdminEndpoints),
            "ResetMechanicPasswordAsync",
            7,
            new AdminEndpoints.ResetMechanicPasswordRequest("Temp-Pass-1!"),
            context,
            users,
            db,
            new RecordingSessionRevocation([]),
            null,
            null,
            NullLoggerFactory.Instance,
            aborted.Token));

        Assert.True(aborted.IsCancellationRequested);
        Assert.Contains(nameof(UserManager<IdentityUser>.ResetPasswordAsync), users.Calls);
        Assert.Equal(1, unit.Runs);
        Assert.False(unit.Token.IsCancellationRequested);
    }
}
