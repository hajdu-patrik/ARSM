using AutoService.ApiService.Appointments;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Validation;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.Appointments;

/** The intake checks that need no database: status, email, task, schedule and the vehicle choice, in that order. */
public sealed class AppointmentIntakeValidationTests
{
    private static readonly DateTime Scheduled = new(2026, 11, 5, 8, 0, 0, DateTimeKind.Utc);

    private static AppointmentEndpoints.SchedulerCreateIntakeRequest Request(
        string email = " Anna@Example.Test ",
        string task = "  Olajcsere  ",
        DateTime? scheduled = null,
        DateTime? due = null,
        int? vehicleId = 1,
        AppointmentEndpoints.SchedulerNewVehicleRequest? vehicle = null,
        string? status = null) =>
        new(email, "Anna", null, "Kovács", null, vehicleId, vehicle, scheduled ?? Scheduled, due ?? Scheduled.AddHours(4), task, status);

    private static AppointmentEndpoints.SchedulerNewVehicleRequest NewVehicle() =>
        new("ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia", 2018, 1000, 85, "Diesel");

    private static (IResult? Result, object?[] Args) Validate(AppointmentEndpoints.SchedulerCreateIntakeRequest request)
    {
        object?[] args = [request, NullLogger.Instance, null, null, null, null];
        var result = (IResult?)PrivateStatic.Run(typeof(AppointmentEndpoints), "ValidateIntakeRequest", args);
        return (result, args);
    }

    [Fact]
    public void A_valid_request_with_an_existing_vehicle_yields_normalized_email_task_and_utc_dates()
    {
        var (result, args) = Validate(Request());

        Assert.Null(result);
        Assert.Equal("anna@example.test", args[2]);
        Assert.Equal("Olajcsere", args[3]);
        Assert.Equal(Scheduled, args[4]);
        Assert.Equal(Scheduled.AddHours(4), args[5]);
    }

    [Fact]
    public void A_valid_request_with_a_new_vehicle_passes()
    {
        Assert.Null(Validate(Request(vehicleId: null, vehicle: NewVehicle())).Result);
    }

    [Fact]
    public void A_due_time_equal_to_the_scheduled_time_is_allowed()
    {
        Assert.Null(Validate(Request(due: Scheduled)).Result);
    }

    [Fact]
    public void A_caller_supplied_status_is_refused()
    {
        ResultAssert.Problem(
            Validate(Request(status: "Completed")).Result,
            422,
            "Status cannot be provided for intake creation. New appointments always start as InProgress.");
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    public void An_invalid_email_is_refused(string email)
    {
        ResultAssert.Problem(Validate(Request(email: email)).Result, 422, ValidationMessages.InvalidEmail);
    }

    [Theory]
    [InlineData("")]
    [InlineData("    ")]
    public void A_blank_task_is_refused(string task)
    {
        ResultAssert.Problem(Validate(Request(task: task)).Result, 422, "TaskDescription is required.");
    }

    [Fact]
    public void A_task_of_200_characters_passes_and_201_is_refused()
    {
        Assert.Null(Validate(Request(task: new string('t', 200))).Result);
        ResultAssert.Problem(
            Validate(Request(task: new string('t', 201))).Result, 422, "TaskDescription must be at most 200 characters.");
    }

    [Fact]
    public void Missing_dates_are_refused_scheduled_first()
    {
        ResultAssert.Problem(Validate(Request(scheduled: default(DateTime))).Result, 422, "ScheduledDate is required.");
        ResultAssert.Problem(Validate(Request(due: default(DateTime))).Result, 422, "DueDateTime is required.");
    }

    [Fact]
    public void A_due_time_before_the_scheduled_time_is_refused()
    {
        ResultAssert.Problem(
            Validate(Request(due: Scheduled.AddMinutes(-1))).Result,
            422,
            "DueDateTime must be greater than or equal to ScheduledDate.");
    }

    [Fact]
    public void Exactly_one_of_vehicle_id_and_new_vehicle_is_required()
    {
        const string detail = "Provide either VehicleId or Vehicle, but not both.";

        ResultAssert.Problem(Validate(Request(vehicleId: null, vehicle: null)).Result, 422, detail);
        ResultAssert.Problem(Validate(Request(vehicleId: 3, vehicle: NewVehicle())).Result, 422, detail);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void A_non_positive_vehicle_id_is_refused(int vehicleId)
    {
        ResultAssert.Problem(Validate(Request(vehicleId: vehicleId)).Result, 422, "VehicleId must be a positive integer.");
    }

    [Fact]
    public void The_email_is_checked_before_the_task_and_the_status_before_the_email()
    {
        ResultAssert.Problem(Validate(Request(email: "bad", task: "")).Result, 422, ValidationMessages.InvalidEmail);
        ResultAssert.Problem(Validate(Request(email: "bad", status: "x")).Result, 422, "Status cannot be provided for intake creation. New appointments always start as InProgress.");
    }

    [Fact]
    public void Intake_length_errors_are_keyed_by_the_request_property_names()
    {
        var name = new FullName(new string('a', 51), new string('b', 51), new string('c', 51));

        var errors = PrivateStatic.Call<Dictionary<string, string[]>>(
            typeof(AppointmentEndpoints), "GetIntakeLengthErrors", name, new string('e', 151), new string('1', 21));

        Assert.Equal(
            new[] { "CustomerEmail", "CustomerFirstName", "CustomerLastName", "CustomerMiddleName", "CustomerPhoneNumber" },
            errors.Keys.OrderBy(key => key).ToArray());
    }

    [Fact]
    public void Intake_length_errors_are_empty_for_a_name_at_the_limits_and_no_phone()
    {
        var name = new FullName(new string('a', 50), null, new string('c', 50));

        var errors = PrivateStatic.Call<Dictionary<string, string[]>>(
            typeof(AppointmentEndpoints), "GetIntakeLengthErrors", name, new string('e', 150), (string?)null);

        Assert.Empty(errors);
    }

    [Fact]
    public void The_new_intake_customer_name_is_checked_first_last_then_middle()
    {
        IResult? Check(FullName name) => PrivateStatic.Call<IResult?>(typeof(AppointmentEndpoints), "ValidateIntakeCustomerName", name);

        Assert.Null(Check(new FullName("Anna", null, "Kovács")));
        Assert.Null(Check(new FullName("Anna", "Mária", "Kovács")));
        ResultAssert.Problem(Check(new FullName("A1", "M2", "K3")), 422, ValidationMessages.InvalidFirstName);
        ResultAssert.Problem(Check(new FullName("Anna", "M2", "K3")), 422, ValidationMessages.InvalidLastName);
        ResultAssert.Problem(Check(new FullName("Anna", "M2", "Kovács")), 422, ValidationMessages.InvalidMiddleName);
    }
}
