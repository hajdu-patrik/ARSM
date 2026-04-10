using System.Security.Claims;
using AutoService.ApiService.Common;
using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using AutoService.ApiService.Models.UniqueTypes;
using AutoService.ApiService.Vehicles;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    private static async Task<IResult> CreateIntakeAsync(
        SchedulerCreateIntakeRequest request,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (request.Status is not null)
        {
            return Results.Problem(
                detail: "Status cannot be provided for intake creation. New appointments always start as InProgress.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!ContactNormalization.TryNormalizeEmail(request.CustomerEmail, out var normalizedEmail))
        {
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

        if (scheduledDateUtc.Date < DateTime.UtcNow.Date)
        {
            return Results.Problem(
                detail: "ScheduledDate cannot be in the past.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

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
            return Results.Unauthorized();
        }

        var mechanic = await db.Mechanics
            .FirstOrDefaultAsync(m => m.Id == mechanicId, cancellationToken);

        if (mechanic is null)
        {
            return Results.Unauthorized();
        }

        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        var creatingCustomer = customer is null;
        if (creatingCustomer)
        {
            var emailInUseByAnotherPersonType = await db.People
                .AnyAsync(p => p.Email == normalizedEmail, cancellationToken);

            if (emailInUseByAnotherPersonType)
            {
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

            if (string.IsNullOrWhiteSpace(request.CustomerFirstName) ||
                string.IsNullOrWhiteSpace(request.CustomerLastName))
            {
                return Results.Problem(
                    detail: "CustomerFirstName and CustomerLastName are required when customer is created.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var firstName = request.CustomerFirstName.Trim();
            var lastName = request.CustomerLastName.Trim();
            var middleName = ContactNormalization.NormalizeOptional(request.CustomerMiddleName);

            if (!ContactNormalization.IsValidName(firstName))
            {
                return Results.Problem(
                    detail: ValidationMessages.InvalidFirstName,
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            if (!ContactNormalization.IsValidName(lastName))
            {
                return Results.Problem(
                    detail: ValidationMessages.InvalidLastName,
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            if (middleName is not null && !ContactNormalization.IsValidName(middleName))
            {
                return Results.Problem(
                    detail: ValidationMessages.InvalidMiddleName,
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            var normalizedPhone = ContactNormalization.NormalizeOptional(request.CustomerPhoneNumber);
            if (normalizedPhone is not null &&
                !ContactNormalization.TryNormalizeHungarianPhoneNumber(normalizedPhone, out normalizedPhone))
            {
                return Results.Problem(
                    detail: ValidationMessages.InvalidPhone,
                    statusCode: StatusCodes.Status422UnprocessableEntity);
            }

            customer = new Customer(
                new FullName(firstName, middleName, lastName),
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
                return Results.Problem(
                    detail: "Vehicle not found.",
                    statusCode: StatusCodes.Status404NotFound);
            }

            if (customer is null || existingVehicle.CustomerId != customer.Id)
            {
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

            if (newVehicle.MileageKm < 0 || newVehicle.EnginePowerHp < 0 || newVehicle.EngineTorqueNm < 0)
            {
                return Results.Problem(
                    detail: "Vehicle.MileageKm, Vehicle.EnginePowerHp, and Vehicle.EngineTorqueNm must be non-negative.",
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
            return Results.Problem(
                detail: "Unable to create intake due to conflicting customer or vehicle data.",
                statusCode: StatusCodes.Status409Conflict);
        }

        return Results.Created($"/api/appointments/{appointment.Id}", ToDto(appointment));
    }

    private static DateTime NormalizeToUtc(DateTime dateTime)
        => dateTime.Kind switch
        {
            DateTimeKind.Utc => dateTime,
            DateTimeKind.Local => dateTime.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)
        };

    private static bool IsUniqueConstraintViolation(DbUpdateException exception)
        => exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}
