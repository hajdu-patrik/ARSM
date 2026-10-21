using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

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
            return ApiProblem.Unprocessable("Status cannot be provided for intake creation. New appointments always start as InProgress.");
        }

        if (!ContactNormalization.TryNormalizeEmail(request.CustomerEmail, out normalizedEmail))
        {
            logger.LogWarning("Intake rejected due to invalid customer email format.");
            return ApiProblem.Unprocessable(ValidationMessages.InvalidEmail);
        }

        var trimmedTask = request.TaskDescription?.Trim();
        if (string.IsNullOrWhiteSpace(trimmedTask))
        {
            return ApiProblem.Unprocessable("TaskDescription is required.");
        }

        if (trimmedTask.Length > 200)
        {
            return ApiProblem.Unprocessable("TaskDescription must be at most 200 characters.");
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
            return ApiProblem.Unprocessable("ScheduledDate is required.");
        }

        if (request.DueDateTime == default)
        {
            return ApiProblem.Unprocessable("DueDateTime is required.");
        }

        scheduledDateUtc = NormalizeToUtc(request.ScheduledDate);
        dueDateTimeUtc = NormalizeToUtc(request.DueDateTime);

        return dueDateTimeUtc < scheduledDateUtc
            ? ApiProblem.Unprocessable("DueDateTime must be greater than or equal to ScheduledDate.")
            : null;
    }

    private static IResult? ValidateIntakeVehicleChoice(SchedulerCreateIntakeRequest request)
    {
        var usesExistingVehicle = request.VehicleId.HasValue;
        var createsVehicle = request.Vehicle is not null;

        if (usesExistingVehicle == createsVehicle)
        {
            return ApiProblem.Unprocessable("Provide either VehicleId or Vehicle, but not both.");
        }

        return usesExistingVehicle && request.VehicleId <= 0
            ? ApiProblem.Unprocessable("VehicleId must be a positive integer.")
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
            return (ApiProblem.Conflict("Email is already used by a non-customer account."), null);
        }

        if (request.VehicleId.HasValue)
        {
            return (ApiProblem.Unprocessable("VehicleId can only be used for an existing customer."), null);
        }

        if (linkedMechanicForEmail is null &&
            (string.IsNullOrWhiteSpace(request.CustomerFirstName) ||
             string.IsNullOrWhiteSpace(request.CustomerLastName)))
        {
            return (ApiProblem.Unprocessable("CustomerFirstName and CustomerLastName are required when customer is created."), null);
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
            return (ApiProblem.Unprocessable(ValidationMessages.InvalidPhone), null);
        }

        if (normalizedPhone is not null &&
            await db.People.AnyAsync(p => p.PhoneNumber == normalizedPhone, cancellationToken))
        {
            return (ApiProblem.Conflict("A person with this phone number already exists."), null);
        }

        return (null, new Customer(name, normalizedEmail, normalizedPhone));
    }

    private static IResult? ValidateIntakeCustomerName(FullName name)
    {
        var error = NameFieldsValidator.GetNameError(name.FirstName, "FirstName")
            ?? NameFieldsValidator.GetNameError(name.LastName, "LastName")
            ?? (name.MiddleName is null ? null : NameFieldsValidator.GetNameError(name.MiddleName, "MiddleName"));

        return error is null ? null : ApiProblem.Unprocessable(error);
    }
}
