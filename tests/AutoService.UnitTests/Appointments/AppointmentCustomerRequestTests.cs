using AutoService.ApiService.Appointments;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.UnitTests.Http;
using AutoService.UnitTests.Quotes;
using Microsoft.AspNetCore.Http;

namespace AutoService.UnitTests.Appointments;

/** Create-for-customer validation (before any lookup) and the unsaved appointment it builds. */
public sealed class AppointmentCustomerRequestTests
{
    private static readonly DateTime Scheduled = new(2026, 11, 5, 8, 0, 0, DateTimeKind.Utc);

    private static AppointmentEndpoints.CreateCustomerAppointmentRequest Request(
        int vehicleId = 3,
        string? task = "  Olajcsere  ",
        IReadOnlyList<int>? mechanicIds = null,
        DateTime? scheduled = null) =>
        new(vehicleId, scheduled ?? Scheduled, task!, mechanicIds ?? new[] { 1, 2 });

    private static (IResult? Result, object?[] Args) Validate(AppointmentEndpoints.CreateCustomerAppointmentRequest request)
    {
        object?[] args = [request, null, null];
        var result = (IResult?)PrivateStatic.Run(typeof(AppointmentEndpoints), "ValidateCreateForCustomerRequest", args);
        return (result, args);
    }

    [Fact]
    public void A_valid_request_yields_the_trimmed_task_and_the_unique_mechanic_ids()
    {
        var (result, args) = Validate(Request());

        Assert.Null(result);
        Assert.Equal("Olajcsere", args[1]);
        Assert.Equal(new[] { 1, 2 }, (int[])args[2]!);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void A_non_positive_vehicle_id_is_refused_first(int vehicleId)
    {
        ResultAssert.Problem(Validate(Request(vehicleId, task: "")).Result, 422, "VehicleId must be a positive integer.");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void A_blank_task_is_refused(string? task)
    {
        ResultAssert.Problem(Validate(Request(task: task)).Result, 422, "TaskDescription is required.");
    }

    [Fact]
    public void A_task_of_200_characters_passes_and_201_is_refused()
    {
        Assert.Null(Validate(Request(task: new string('t', 200))).Result);
        ResultAssert.Problem(Validate(Request(task: new string('t', 201))).Result, 422, "TaskDescription must be at most 200 characters.");
    }

    [Fact]
    public void At_least_one_mechanic_is_required()
    {
        ResultAssert.Problem(Validate(Request(mechanicIds: [])).Result, 422, "At least one mechanic must be assigned.");
        var withoutList = new AppointmentEndpoints.CreateCustomerAppointmentRequest(3, Scheduled, "Olajcsere", null!);
        ResultAssert.Problem(Validate(withoutList).Result, 422, "At least one mechanic must be assigned.");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public void A_non_positive_mechanic_id_is_refused(int mechanicId)
    {
        ResultAssert.Problem(Validate(Request(mechanicIds: [1, mechanicId])).Result, 422, "MechanicIds must contain positive values only.");
    }

    [Fact]
    public void A_repeated_mechanic_id_is_refused()
    {
        ResultAssert.Problem(Validate(Request(mechanicIds: [2, 2])).Result, 422, "MechanicIds must be unique.");
    }

    [Fact]
    public void A_missing_scheduled_date_is_refused_last()
    {
        ResultAssert.Problem(Validate(Request(scheduled: default(DateTime))).Result, 422, "ScheduledDate is required.");
    }

    [Fact]
    public void CreateCustomerAppointment_starts_in_progress_and_is_due_at_its_scheduled_time()
    {
        var vehicle = QuoteFixtures.NewVehicle();
        var mechanics = new List<Mechanic> { QuoteFixtures.NewMechanic() };

        var appointment = PrivateStatic.Call<Appointment>(
            typeof(AppointmentEndpoints), "CreateCustomerAppointment", vehicle, mechanics, "Olajcsere", Scheduled);

        Assert.Equal(ProgressStatus.InProgress, appointment.Status);
        Assert.Equal((Scheduled, Scheduled), (appointment.ScheduledDate, appointment.DueDateTime));
        Assert.Equal("Olajcsere", appointment.TaskDescription);
        Assert.Equal(3, appointment.VehicleId);
        Assert.Same(vehicle, appointment.Vehicle);
        Assert.Same(mechanics, appointment.Mechanics);
        Assert.Null(appointment.CompletedAt);
        Assert.Null(appointment.CanceledAt);
    }
}
