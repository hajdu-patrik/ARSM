using System.Security.Claims;
using AutoService.ApiService.Appointments;
using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Profile.Endpoints;
using AutoService.ApiService.Profile.Realtime;
using AutoService.ApiService.Realtime;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Http;

namespace AutoService.UnitTests.Realtime;

/** The two real SSE endpoints answer 503 with their own detail once their real broadcaster is at the 5 per person or 200 overall cap. */
public sealed class StreamEndpointCapacityTests
{
    private const string AppointmentDetail = "Too many active appointment update subscriptions. Please retry later.";
    private const string PictureDetail = "Too many active profile picture update subscriptions. Please retry later.";

    private static DefaultHttpContext ContextFor(int personId)
    {
        var context = new DefaultHttpContext();
        context.User = new ClaimsPrincipal(
            new ClaimsIdentity([new Claim(PersonIdClaim.Type, personId.ToString())], "test"));
        return context;
    }

    private static void Fill<TEvent>(IUpdateBroadcaster<TEvent> broadcaster, int people, int streamsPerPerson)
    {
        for (var person = 1; person <= people; person++)
        {
            for (var stream = 0; stream < streamsPerPerson; stream++)
            {
                Assert.True(broadcaster.TrySubscribe(person, out _, out _));
            }
        }
    }

    private static async Task AssertRefusedAsync(Task<IResult> serving, DefaultHttpContext context, string detail)
    {
        var result = await serving.WaitAsync(TimeSpan.FromSeconds(5));

        ResultAssert.Problem(result, StatusCodes.Status503ServiceUnavailable, detail);
        Assert.Null(context.Response.ContentType);
    }

    private static Task<IResult> ServeAppointments(DefaultHttpContext context, IAppointmentUpdateBroadcaster broadcaster) =>
        PrivateStatic.Call<Task<IResult>>(
            typeof(AppointmentEndpoints), "StreamAppointmentUpdatesAsync", context, broadcaster, CancellationToken.None);

    private static Task<IResult> ServePictures(DefaultHttpContext context, IProfilePictureUpdateBroadcaster broadcaster) =>
        PrivateStatic.Call<Task<IResult>>(
            typeof(ProfileEndpoints), "StreamProfilePictureUpdatesAsync", context, broadcaster, CancellationToken.None);

    [Fact]
    public async Task A_sixth_appointment_stream_of_one_person_is_refused_with_the_appointment_detail()
    {
        var broadcaster = new AppointmentUpdateBroadcaster();
        Fill(broadcaster, people: 1, streamsPerPerson: 5);
        var context = ContextFor(1);

        await AssertRefusedAsync(ServeAppointments(context, broadcaster), context, AppointmentDetail);
    }

    [Fact]
    public async Task A_201st_appointment_stream_is_refused_even_for_a_person_with_none()
    {
        var broadcaster = new AppointmentUpdateBroadcaster();
        Fill(broadcaster, people: 40, streamsPerPerson: 5);
        var context = ContextFor(41);

        await AssertRefusedAsync(ServeAppointments(context, broadcaster), context, AppointmentDetail);
    }

    [Fact]
    public async Task A_sixth_picture_stream_of_one_person_is_refused_with_the_picture_detail()
    {
        var broadcaster = new ProfilePictureUpdateBroadcaster();
        Fill(broadcaster, people: 1, streamsPerPerson: 5);
        var context = ContextFor(1);

        await AssertRefusedAsync(ServePictures(context, broadcaster), context, PictureDetail);
    }

    [Fact]
    public async Task A_201st_picture_stream_is_refused_even_for_a_person_with_none()
    {
        var broadcaster = new ProfilePictureUpdateBroadcaster();
        Fill(broadcaster, people: 40, streamsPerPerson: 5);
        var context = ContextFor(41);

        await AssertRefusedAsync(ServePictures(context, broadcaster), context, PictureDetail);
    }
}
