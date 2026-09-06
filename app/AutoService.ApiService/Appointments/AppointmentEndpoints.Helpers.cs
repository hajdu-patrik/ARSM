using AutoService.ApiService.Domain;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /**
     * Maps an {@code Appointment} domain entity to its DTO representation.
     * @param appointment - The appointment entity to map.
     * @return The mapped DTO with nested vehicle, customer, and mechanic summaries.
     */
    private static AppointmentDto ToDto(Appointment appointment) => new(
        appointment.Id,
        appointment.ScheduledDate,
        appointment.IntakeCreatedAt,
        appointment.DueDateTime,
        appointment.TaskDescription,
        appointment.Status.ToString(),
        appointment.CompletedAt,
        appointment.CanceledAt,
        new VehicleDto(
            appointment.Vehicle.Id,
            appointment.Vehicle.LicensePlate,
            appointment.Vehicle.Vin,
            appointment.Vehicle.Brand,
            appointment.Vehicle.Model,
            appointment.Vehicle.Year,
            appointment.Vehicle.MileageKm,
            appointment.Vehicle.EnginePowerKw,
            appointment.Vehicle.DrivetrainType.ToString(),
            new CustomerSummaryDto(
                appointment.Vehicle.Customer.Id,
                appointment.Vehicle.Customer.Name.ToString())),
        appointment.Mechanics
            .Select(m => new MechanicSummaryDto(
                m.Id,
                m.Name.ToString(),
                m.Specialization.ToString(),
                m.ProfilePictureObjectKey is not null || m.ProfilePictureContentType is not null))
            .ToList());
}