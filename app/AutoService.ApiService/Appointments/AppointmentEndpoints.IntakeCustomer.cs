using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Validates the caller-supplied intake fields that need no database access and normalizes email and dates. */
    private static IResult? ValidateIntakeRequest(
        SchedulerCreateIntakeRequest request,
        ILogger logger,
        out string normalizedEmail,
        out string taskDescription,
        out DateTime scheduledDateUtc,
        out DateTime dueDateTimeUtc)
    {
        taskDescription = string.Empty;
        scheduledDateUtc = default;
        dueDateTimeUtc = default;

        if (request.Status is not null)
        {
            normalizedEmail = string.Empty;
            logger.LogWarning("Intake rejected because status was provided by caller.");
            return Results.Problem(
                detail: "Status cannot be provided for intake creation. New appointments always start as InProgress.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!ContactNormalization.TryNormalizeEmail(request.CustomerEmail, out normalizedEmail))
        {
            logger.LogWarning("Intake rejected due to invalid customer email format.");
            return Results.Problem(
                detail: ValidationMessages.InvalidEmail,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var trimmedTask = request.TaskDescription?.Trim();
        if (string.IsNullOrWhiteSpace(trimmedTask))
        {
            return IntakeProblem("TaskDescription is required.");
        }

        if (trimmedTask.Length > 200)
        {
            return IntakeProblem("TaskDescription must be at most 200 characters.");
        }

        taskDescription = trimmedTask;
        return ValidateIntakeSchedule(request, out scheduledDateUtc, out dueDateTimeUtc)
            ?? ValidateIntakeVehicleChoice(request);
    }

    private static IResult? ValidateIntakeSchedule(
        SchedulerCreateIntakeRequest request,
        out DateTime scheduledDateUtc,
        out DateTime dueDateTimeUtc)
    {
        scheduledDateUtc = default;
        dueDateTimeUtc = default;

        if (request.ScheduledDate == default)
        {
            return IntakeProblem("ScheduledDate is required.");
        }

        if (request.DueDateTime == default)
        {
            return IntakeProblem("DueDateTime is required.");
        }

        scheduledDateUtc = NormalizeToUtc(request.ScheduledDate);
        dueDateTimeUtc = NormalizeToUtc(request.DueDateTime);

        return dueDateTimeUtc < scheduledDateUtc
            ? IntakeProblem("DueDateTime must be greater than or equal to ScheduledDate.")
            : null;
    }

    private static IResult? ValidateIntakeVehicleChoice(SchedulerCreateIntakeRequest request)
    {
        var usesExistingVehicle = request.VehicleId.HasValue;
        var createsVehicle = request.Vehicle is not null;

        if (usesExistingVehicle == createsVehicle)
        {
            return IntakeProblem("Provide either VehicleId or Vehicle, but not both.");
        }

        return usesExistingVehicle && request.VehicleId <= 0
            ? IntakeProblem("VehicleId must be a positive integer.")
            : null;
    }

    /** Builds the unsaved customer of an intake whose email matches no customer yet. */
    private static async Task<(IResult? Error, Customer? Customer)> CreateIntakeCustomerAsync(
        SchedulerCreateIntakeRequest request,
        Mechanic? linkedMechanicForEmail,
        string normalizedEmail,
        AutoServiceDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var emailInUseByAnotherPersonType = linkedMechanicForEmail is null && await db.People
            .AnyAsync(p => p.Email == normalizedEmail, cancellationToken);

        if (emailInUseByAnotherPersonType)
        {
            logger.LogWarning("Intake rejected due to customer email conflict with non-customer account.");
            return (Results.Problem(
                detail: "Email is already used by a non-customer account.",
                statusCode: StatusCodes.Status409Conflict), null);
        }

        if (request.VehicleId.HasValue)
        {
            return (IntakeProblem("VehicleId can only be used for an existing customer."), null);
        }

        if (linkedMechanicForEmail is null &&
            (string.IsNullOrWhiteSpace(request.CustomerFirstName) ||
             string.IsNullOrWhiteSpace(request.CustomerLastName)))
        {
            return (IntakeProblem("CustomerFirstName and CustomerLastName are required when customer is created."), null);
        }

        var name = new FullName(
            linkedMechanicForEmail?.Name.FirstName ?? request.CustomerFirstName!.Trim(),
            linkedMechanicForEmail?.Name.MiddleName ?? ContactNormalization.NormalizeOptional(request.CustomerMiddleName),
            linkedMechanicForEmail?.Name.LastName ?? request.CustomerLastName!.Trim());

        var nameError = ValidateIntakeCustomerName(name);
        if (nameError is not null)
        {
            return (nameError, null);
        }

        var normalizedPhone = ContactNormalization.NormalizeOptional(request.CustomerPhoneNumber);
        if (normalizedPhone is not null &&
            !ContactNormalization.TryNormalizeEuPhoneNumber(normalizedPhone, out normalizedPhone))
        {
            return (IntakeProblem(ValidationMessages.InvalidPhone), null);
        }

        if (normalizedPhone is not null &&
            await db.People.AnyAsync(p => p.PhoneNumber == normalizedPhone, cancellationToken))
        {
            return (Results.Problem(
                detail: "A person with this phone number already exists.",
                statusCode: StatusCodes.Status409Conflict), null);
        }

        return (null, new Customer(name, normalizedEmail, normalizedPhone));
    }

    private static IResult? ValidateIntakeCustomerName(FullName name)
    {
        var error = NameFieldsValidator.GetNameError(name.FirstName, "FirstName")
            ?? NameFieldsValidator.GetNameError(name.LastName, "LastName")
            ?? (name.MiddleName is null ? null : NameFieldsValidator.GetNameError(name.MiddleName, "MiddleName"));

        return error is null ? null : IntakeProblem(error);
    }

    private static IResult IntakeProblem(string detail) => Results.Problem(
        detail: detail,
        statusCode: StatusCodes.Status422UnprocessableEntity);
}
