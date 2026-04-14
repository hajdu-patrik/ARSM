/**
 * AppointmentEndpoints.Helpers.cs
 *
 * Auto-generated documentation header for this source file.
 */

using AutoService.ApiService.Domain;

namespace AutoService.ApiService.Appointments;

/**
 * Backend type for API logic in this file.
 */
public static partial class AppointmentEndpoints
{
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
            appointment.Vehicle.Brand,
            appointment.Vehicle.Model,
            appointment.Vehicle.Year,
            appointment.Vehicle.MileageKm,
            appointment.Vehicle.EnginePowerHp,
            appointment.Vehicle.EngineTorqueNm,
            new CustomerSummaryDto(
                appointment.Vehicle.Customer.Id,
                appointment.Vehicle.Customer.Name.ToString(),
                appointment.Vehicle.Customer.Email)),
        appointment.Mechanics
            .Select(m => new MechanicSummaryDto(
                m.Id,
                m.Name.ToString(),
                m.Email,
                m.Specialization.ToString(),
                m.Expertise.Select(e => e.ToString()).ToList(),
                m.ProfilePicture is not null && m.ProfilePictureContentType is not null))
            .ToList());
}