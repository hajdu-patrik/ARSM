/**
 * AppointmentEndpoints.Intake.cs
 *
 * Auto-generated documentation header for this source file.
 */

using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Vehicles;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AutoService.ApiService.Appointments;

/**
 * Backend type for API logic in this file.
 */
public static partial class AppointmentEndpoints
{
        private static async Task<IResult> CreateIntakeAsync(
        SchedulerCreateIntakeRequest request,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.Intake");

        if (request.Status is not null)
        {
            logger.LogWarning("Intake rejected because status was provided by caller.");
            return Results.Problem(
                detail: "Status cannot be provided for intake creation. New appointments always start as InProgress.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!ContactNormalization.TryNormalizeEmail(request.CustomerEmail, out var normalizedEmail))
        {
            logger.LogWarning("Intake rejected due to invalid customer email format.");
            return Results.Problem(
                detail: ValidationMessages.InvalidEmail,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var taskDescription = request.TaskDescription?.Trim();
        if (string.IsNullOrWhiteSpace(taskDescription))
        {
            return Results.Problem(
                detail: "TaskDescription is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (taskDescription.Length > 200)
        {
            return Results.Problem(
                detail: "TaskDescription must be at most 200 characters.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.ScheduledDate == default)
        {
            return Results.Problem(
                detail: "ScheduledDate is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.DueDateTime == default)
        {
            return Results.Problem(
                detail: "DueDateTime is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var scheduledDateUtc = NormalizeToUtc(request.ScheduledDate);
        var dueDateTimeUtc = NormalizeToUtc(request.DueDateTime);

        if (dueDateTimeUtc < scheduledDateUtc)
        {
            return Results.Problem(
                detail: "DueDateTime must be greater than or equal to ScheduledDate.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var usesExistingVehicle = request.VehicleId.HasValue;
        var createsVehicle = request.Vehicle is not null;

        if (usesExistingVehicle == createsVehicle)
        {
            return Results.Problem(
                detail: "Provide either VehicleId or Vehicle, but not both.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (usesExistingVehicle && request.VehicleId <= 0)
        {
            return Results.Problem(
                detail: "VehicleId must be a positive integer.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var personIdClaim = user.FindFirst("person_id")?.Value;
        if (string.IsNullOrWhiteSpace(personIdClaim) || !int.TryParse(personIdClaim, out var mechanicId))
        {
            logger.LogWarning("Intake rejected: missing or invalid person_id claim.");
            return Results.Unauthorized();
        }

        var mechanic = await db.Mechanics
            .FirstOrDefaultAsync(m => m.Id == mechanicId, cancellationToken);

        if (mechanic is null)
        {
            logger.LogWarning("Intake rejected: requesting mechanic {MechanicId} not found.", mechanicId);
            return Results.Unauthorized();
        }

        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        var linkedMechanicForEmail = customer is null
            ? await db.Mechanics.FirstOrDefaultAsync(m => m.Email == normalizedEmail, cancellationToken)
            : null;

        if (customer is null && linkedMechanicForEmail is not null)
        {
            var mechanicOwnedCustomerEmail = CustomerOwnerLinking.BuildMechanicOwnedCustomerEmail(linkedMechanicForEmail.Id);
            customer = await db.Customers
                .FirstOrDefaultAsync(c => c.Email == mechanicOwnedCustomerEmail, cancellationToken);
            normalizedEmail = mechanicOwnedCustomerEmail;
        }

        var creatingCustomer = customer is null;
        if (creatingCustomer)
        {
            var emailInUseByAnotherPersonType = linkedMechanicForEmail is null && await db.People
                .AnyAsync(p => p.Email == normalizedEmail, cancellationToken);

            if (emailInUseByAnotherPersonType)
            {
                logger.LogWarning("Intake rejected due to customer email conflict with non-customer account.");
                return Results.Problem(
                    detail: "Email is already used by a non-customer account.",
                    statusCode: StatusCodes.Status409Conflict);
            }

            if (usesExistingVehicle)
            {
                return Results.Problem(
                    detail: "VehicleId can only be used for an existing customer.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            if (linkedMechanicForEmail is null &&
                (string.IsNullOrWhiteSpace(request.CustomerFirstName) ||
                 string.IsNullOrWhiteSpace(request.CustomerLastName)))
            {
                return Results.Problem(
                    detail: "CustomerFirstName and CustomerLastName are required when customer is created.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var firstName = linkedMechanicForEmail?.Name.FirstName ?? request.CustomerFirstName!.Trim();
            var lastName = linkedMechanicForEmail?.Name.LastName ?? request.CustomerLastName!.Trim();
            var middleName = linkedMechanicForEmail?.Name.MiddleName ?? ContactNormalization.NormalizeOptional(request.CustomerMiddleName);

            var firstNameError = NameFieldsValidator.GetNameError(firstName, "FirstName");
            if (firstNameError is not null)
            {
                return Results.Problem(detail: firstNameError, statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var lastNameError = NameFieldsValidator.GetNameError(lastName, "LastName");
            if (lastNameError is not null)
            {
                return Results.Problem(detail: lastNameError, statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            if (middleName is not null)
            {
                var middleNameError = NameFieldsValidator.GetNameError(middleName, "MiddleName");
                if (middleNameError is not null)
                {
                    return Results.Problem(detail: middleNameError, statusCode: StatusCodes.Status422UnprocessableEntity);
                }
            }

            var normalizedPhone = ContactNormalization.NormalizeOptional(request.CustomerPhoneNumber);
            if (normalizedPhone is not null &&
                !ContactNormalization.TryNormalizeEuPhoneNumber(normalizedPhone, out normalizedPhone))
            {
                return Results.Problem(
                    detail: ValidationMessages.InvalidPhone,
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var customerFirstName = firstName;
            var customerMiddleName = middleName;
            var customerLastName = lastName;

            if (linkedMechanicForEmail is not null)
            {
                if (normalizedPhone is null)
                {
                    normalizedPhone = linkedMechanicForEmail.PhoneNumber;
                }
            }

            customer = new Customer(
                new FullName(customerFirstName, customerMiddleName, customerLastName),
                normalizedEmail,
                normalizedPhone);
        }

        Vehicle vehicle;
        if (usesExistingVehicle)
        {
            var requestedVehicleId = request.VehicleId.GetValueOrDefault();
            Vehicle? existingVehicle = await db.Vehicles
                .Where(v => v.Id == requestedVehicleId)
                .Select(v => (Vehicle?)v)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingVehicle is null)
            {
                logger.LogInformation("Intake failed: requested vehicle {VehicleId} not found.", requestedVehicleId);
                return Results.Problem(
                    detail: "Vehicle not found.",
                    statusCode: StatusCodes.Status404NotFound);
            }

            if (customer is null || existingVehicle.CustomerId != customer.Id)
            {
                logger.LogWarning("Intake rejected: vehicle {VehicleId} does not belong to selected customer.", requestedVehicleId);
                return Results.Problem(
                    detail: "Vehicle does not belong to the selected customer.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            vehicle = existingVehicle;
        }
        else
        {
            var newVehicle = request.Vehicle!;

            if (string.IsNullOrWhiteSpace(newVehicle.LicensePlate) ||
                string.IsNullOrWhiteSpace(newVehicle.Brand) ||
                string.IsNullOrWhiteSpace(newVehicle.Model))
            {
                return Results.Problem(
                    detail: "Vehicle.LicensePlate, Vehicle.Brand, and Vehicle.Model are required.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var vehicleLengthValidationError = VehicleEndpoints.GetVehicleFieldLengthValidationError(
                newVehicle.LicensePlate,
                newVehicle.Brand,
                newVehicle.Model,
                fieldPrefix: "Vehicle.");

            if (vehicleLengthValidationError is not null)
            {
                return Results.Problem(
                    detail: vehicleLengthValidationError,
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            if (newVehicle.Year is < 1886 or > 2100)
            {
                return Results.Problem(
                    detail: "Vehicle.Year must be between 1886 and 2100.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var vehicleNumericValidationError = VehicleNumericValidation.GetValidationError(
                newVehicle.MileageKm,
                newVehicle.EnginePowerHp,
                newVehicle.EngineTorqueNm,
                fieldPrefix: "Vehicle.");

            if (vehicleNumericValidationError is not null)
            {
                return Results.Problem(
                    detail: vehicleNumericValidationError,
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(newVehicle.LicensePlate, out var normalizedPlate, out var plateValidationError))
            {
                return Results.Problem(
                    detail: plateValidationError,
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var plateExists = await db.Vehicles
                .AnyAsync(v => v.LicensePlate == normalizedPlate, cancellationToken);

            if (plateExists)
            {
                return Results.Problem(
                    detail: "A vehicle with this license plate already exists.",
                    statusCode: StatusCodes.Status409Conflict);
            }

            vehicle = new Vehicle(
                normalizedPlate,
                newVehicle.Brand.Trim(),
                newVehicle.Model.Trim(),
                newVehicle.Year,
                newVehicle.MileageKm,
                newVehicle.EnginePowerHp,
                newVehicle.EngineTorqueNm)
            {
                Customer = customer!
            };

            if (customer!.Id > 0)
            {
                vehicle.CustomerId = customer.Id;
            }
        }

        var appointment = new Appointment
        {
            ScheduledDate = scheduledDateUtc,
            IntakeCreatedAt = DateTime.UtcNow,
            DueDateTime = dueDateTimeUtc,
            TaskDescription = taskDescription,
            Status = ProgresStatus.InProgress,
            Vehicle = vehicle,
            Mechanics = new List<Mechanic> { mechanic }
        };

        if (vehicle.Id > 0)
        {
            appointment.VehicleId = vehicle.Id;
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (creatingCustomer)
            {
                db.Customers.Add(customer!);
            }

            if (!usesExistingVehicle)
            {
                db.Vehicles.Add(vehicle);
            }

            db.Appointments.Add(appointment);

            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            await transaction.RollbackAsync(cancellationToken);
            logger.LogWarning("Intake creation failed due to unique constraint conflict.");
            return Results.Problem(
                detail: "Unable to create intake due to conflicting customer or vehicle data.",
                statusCode: StatusCodes.Status409Conflict);
        }

        logger.LogInformation(
            "Intake created appointment {AppointmentId} by mechanic {MechanicId}. CreatedCustomer: {CreatedCustomer}, UsedExistingVehicle: {UsedExistingVehicle}.",
            appointment.Id,
            mechanicId,
            creatingCustomer,
            usesExistingVehicle);
        return Results.Created($"/api/appointments/{appointment.Id}", ToDto(appointment));
    }

    private static DateTime NormalizeToUtc(DateTime dateTime)
        => dateTime.Kind switch
        {
            DateTimeKind.Utc => dateTime,
            DateTimeKind.Local => dateTime.ToUniversalTime(),
            // Treat Unspecified as UTC — JSON deserializers often strip kind info.
            _ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)
        };

    private static bool IsUniqueConstraintViolation(DbUpdateException exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                return true;
            }
        }

        return false;
    }
}
