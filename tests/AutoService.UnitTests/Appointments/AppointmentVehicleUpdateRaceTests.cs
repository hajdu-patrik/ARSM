using System.Security.Claims;
using AutoService.ApiService.Appointments;
using AutoService.UnitTests.Data;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.Appointments;

/** PUT /api/appointments/{id}/vehicle racing a delete of that vehicle (and so the appointment) answers 404, not a 500. */
public sealed class AppointmentVehicleUpdateRaceTests
{
    private static readonly Dictionary<string, object?> Row = new()
    {
        ["Id"] = 7, ["Status"] = "InProgress", ["TaskDescription"] = "Olajcsere", ["VehicleId"] = 3, ["xmin"] = 1u,
        ["ScheduledDate"] = new DateTime(2026, 11, 5, 8, 0, 0, DateTimeKind.Utc),
        ["IntakeCreatedAt"] = new DateTime(2026, 11, 5, 7, 0, 0, DateTimeKind.Utc),
        ["DueDateTime"] = new DateTime(2026, 11, 5, 16, 0, 0, DateTimeKind.Utc),
        ["Id0"] = 3, ["Brand"] = "VW", ["CustomerId"] = 1, ["DrivetrainType"] = "Petrol", ["EnginePowerKw"] = 66,
        ["LicensePlate"] = "ABC123", ["MileageKm"] = 1000, ["Model"] = "Golf", ["Vin"] = "WVWZZZ1JZXW000001", ["Year"] = 2010,
        ["Id1"] = 1, ["PersonType"] = "Customer", ["Email"] = "bela@example.com", ["FirstName"] = "Béla", ["LastName"] = "Kovács",
    };

    [Fact]
    public async Task Updating_the_vehicle_of_an_appointment_deleted_in_parallel_answers_404_appointment_not_found()
    {
        await using var db = TestDbContextFactory.Create(
            new NoConnectionInterceptor(),
            new AppointmentRowInterceptor(Row),
            new ScriptedSaveInterceptor(new DbUpdateConcurrencyException("0 rows affected")));
        var request = new AppointmentEndpoints.UpdateAppointmentVehicleRequest(
            "ABC123", "WVWZZZ1JZXW000001", "VW", "Golf", 2011, 2000, 66, "Petrol");
        var admin = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("person_id", "5"), new Claim(ClaimTypes.Role, "Admin")], "test", ClaimTypes.Name, ClaimTypes.Role));

        object?[] args = [7, request, admin, db, NullLoggerFactory.Instance, null, CancellationToken.None];
        var result = await (Task<IResult>)PrivateStatic.Run(typeof(AppointmentEndpoints), "UpdateAppointmentVehicleAsync", args)!;

        Assert.Equal(404, ResultAssert.StatusOf(result));
        Assert.Equal("appointment_not_found", ResultAssert.CodeOf(result));
    }
}
