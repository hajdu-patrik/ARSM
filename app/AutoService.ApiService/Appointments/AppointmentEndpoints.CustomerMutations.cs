using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Http;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Normalization;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    private static async Task<IResult> CreateForCustomerAsync(
        int customerId,
        CreateCustomerAppointmentRequest request,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.CreateForCustomer");

        var validationResult = ValidateCreateForCustomerRequest(request, out var taskDescription, out var uniqueMechanicIds);
        if (validationResult is not null)
        {
            return validationResult;
        }

        var customerExists = await db.Customers
            .AnyAsync(customer => customer.Id == customerId, cancellationToken);

        if (!customerExists)
        {
            logger.LogInformation("CreateForCustomer failed: customer {CustomerId} not found.", customerId);
            return ApiProblem.NotFound("Customer not found.");
        }

        var vehicle = await db.Vehicles
            .Include(v => v.Customer)
            .FirstOrDefaultAsync(v => v.Id == request.VehicleId, cancellationToken);

        if (vehicle is null)
        {
            logger.LogInformation("CreateForCustomer failed: vehicle {VehicleId} not found.", request.VehicleId);
            return ApiProblem.NotFound("Vehicle not found.");
        }

        if (vehicle.CustomerId != customerId)
        {
            logger.LogWarning("CreateForCustomer rejected: vehicle {VehicleId} does not belong to customer {CustomerId}.", request.VehicleId, customerId);
            return ApiProblem.Unprocessable("Vehicle does not belong to the specified customer.");
        }

        var mechanics = await db.Mechanics
            .Where(m => uniqueMechanicIds.Contains(m.Id))
            .ToListAsync(cancellationToken);

        if (mechanics.Count != uniqueMechanicIds.Length)
        {
            logger.LogWarning("CreateForCustomer rejected: one or more mechanic IDs are invalid.");
            return ApiProblem.Unprocessable("One or more mechanicIds are invalid.");
        }

        var scheduledDateUtc = DateTimeNormalization.ToUtc(request.ScheduledDate);
        var appointment = CreateCustomerAppointment(vehicle, mechanics, taskDescription, scheduledDateUtc);

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("CreateForCustomer created appointment {AppointmentId} for customer {CustomerId}.", appointment.Id, customerId);

        PublishAppointmentChanged(broadcaster, appointment.Id);

        return Results.Created($"/api/appointments/{appointment.Id}", ToDto(appointment));
    }

    private static IResult? ValidateCreateForCustomerRequest(
        CreateCustomerAppointmentRequest request,
        out string taskDescription,
        out int[] uniqueMechanicIds)
    {
        taskDescription = request.TaskDescription?.Trim() ?? string.Empty;
        uniqueMechanicIds = [];

        if (request.VehicleId <= 0)
        {
            return ApiProblem.Unprocessable("VehicleId must be a positive integer.");
        }

        if (string.IsNullOrWhiteSpace(taskDescription))
        {
            return ApiProblem.Unprocessable("TaskDescription is required.");
        }

        if (taskDescription.Length > 200)
        {
            return ApiProblem.Unprocessable("TaskDescription must be at most 200 characters.");
        }

        if (request.MechanicIds is null || request.MechanicIds.Count == 0)
        {
            return ApiProblem.Unprocessable("At least one mechanic must be assigned.");
        }

        if (request.MechanicIds.Any(mechanicId => mechanicId <= 0))
        {
            return ApiProblem.Unprocessable("MechanicIds must contain positive values only.");
        }

        uniqueMechanicIds = request.MechanicIds.Distinct().ToArray();
        if (uniqueMechanicIds.Length != request.MechanicIds.Count)
        {
            return ApiProblem.Unprocessable("MechanicIds must be unique.");
        }

        if (request.ScheduledDate == default)
        {
            return ApiProblem.Unprocessable("ScheduledDate is required.");
        }

        return null;
    }

    private static Appointment CreateCustomerAppointment(
        Vehicle vehicle,
        List<Mechanic> mechanics,
        string taskDescription,
        DateTime scheduledDateUtc) => new()
        {
            ScheduledDate = scheduledDateUtc,
            IntakeCreatedAt = DateTime.UtcNow,
            DueDateTime = scheduledDateUtc,
            TaskDescription = taskDescription,
            Status = ProgressStatus.InProgress,
            VehicleId = vehicle.Id,
            Vehicle = vehicle,
            Mechanics = mechanics
        };
}