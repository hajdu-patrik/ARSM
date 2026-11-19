using AutoService.ApiService.Admin;
using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Profile.Endpoints;
using AutoService.UnitTests.Data;
using AutoService.UnitTests.Http;
using AutoService.UnitTests.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using SignInResult = Microsoft.AspNetCore.Identity.SignInResult;

namespace AutoService.UnitTests.Profile;

/** After the delete commits, every session is revoked first: a failing picture cleanup or denylist write cannot skip it (F1). */
public sealed class AccountDeletionOrderTests
{
    private const string PictureKey = "profile-pictures/5/pic.webp";

    private static ScriptedExecutionStrategy CommittedDelete() =>
        new(new MechanicDeletionOutcome(null, new[] { 11 }, PictureKey));

    private static async Task<IResult> DeleteProfile(
        List<string> events, OrderRecordingDenylist denylist, ScriptedExecutionStrategy unit)
    {
        var users = new ScriptedUserManager(new IdentityUser("mechanic") { Id = "identity-5" });
        await using var db = TestDbContextFactory.CreateWithStrategy(
            unit, new NoConnectionInterceptor(), new ScriptedRowsInterceptor(MechanicRows.Row(5, "identity-5")));
        var context = new DefaultHttpContext { User = SessionClaims.SignedIn(5, "jti-1") };

        return await PrivateStatic.Call<Task<IResult>>(
            typeof(ProfileEndpoints),
            "DeleteProfileAsync",
            new ProfileEndpoints.DeleteProfileRequest("Current-Pass-1!"),
            context,
            users,
            new ScriptedSignInManager(users, SignInResult.Success),
            db,
            denylist,
            new RecordingSessionRevocation(events),
            new OrderRecordingStorage(events),
            new AppointmentUpdateBroadcaster(),
            NullLoggerFactory.Instance,
            CancellationToken.None);
    }

    [Fact]
    public async Task Deleting_the_own_profile_revokes_every_session_before_the_picture_cleanup_and_the_denylist_write()
    {
        var events = new List<string>();

        var result = await DeleteProfile(events, new OrderRecordingDenylist(events), CommittedDelete());

        Assert.Equal(StatusCodes.Status200OK, ResultAssert.StatusOf(result));
        Assert.Equal(["RevokeAll", "PictureDelete", "Denylist"], events);
    }

    [Fact]
    public async Task A_failing_denylist_write_after_the_own_profile_delete_leaves_the_sessions_revoked()
    {
        var events = new List<string>();
        var denylist = new OrderRecordingDenylist(events, new InvalidOperationException("database down"));

        await Assert.ThrowsAsync<InvalidOperationException>(() => DeleteProfile(events, denylist, CommittedDelete()));

        Assert.Equal("RevokeAll", events[0]);
    }

    [Fact]
    public async Task Deleting_a_mechanic_as_admin_revokes_every_session_before_the_picture_cleanup()
    {
        var events = new List<string>();
        var users = new ScriptedUserManager(null);
        await using var db = TestDbContextFactory.CreateWithStrategy(
            CommittedDelete(), new NoConnectionInterceptor(), new ScriptedRowsInterceptor(MechanicRows.Row(7, null)));
        var context = new DefaultHttpContext { User = SessionClaims.SignedIn(1, "jti-admin") };

        var result = await PrivateStatic.Call<Task<IResult>>(
            typeof(AdminEndpoints),
            "DeleteMechanicAsync",
            7,
            context,
            users,
            db,
            new RecordingSessionRevocation(events),
            new OrderRecordingStorage(events),
            new AppointmentUpdateBroadcaster(),
            NullLoggerFactory.Instance,
            CancellationToken.None);

        Assert.Equal(StatusCodes.Status200OK, ResultAssert.StatusOf(result));
        Assert.Equal(["RevokeAll", "PictureDelete"], events);
    }
}
