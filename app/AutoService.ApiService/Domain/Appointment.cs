using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.Domain;

/** Service appointment linked to a vehicle and mechanics; the many-to-many with Mechanic persists via EF Core's `appointmentmechanics` join table. */
public class Appointment : IVersioned
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }

    // UTC timestamp of the planned service date.
    public DateTime ScheduledDate { get; set; }

    // UTC timestamp when the intake record was created.
    public DateTime IntakeCreatedAt { get; set; } = DateTime.UtcNow;

    // UTC deadline for completing the appointment.
    public DateTime DueDateTime { get; set; }

    [MaxLength(200)]
    public required string TaskDescription { get; set; }

    // Defaults to InProgress on creation; updated as the appointment progresses.
    public ProgressStatus Status { get; set; } = ProgressStatus.InProgress;

    public DateTime? CompletedAt { get; set; }
    public DateTime? CanceledAt { get; set; }

    // Optimistic-concurrency token mapped to Postgres xmin (Data/OptimisticConcurrency), not a real column.
    public uint Version { get; private set; }

    // Relationship: each appointment belongs to exactly one vehicle.
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    // Mechanics assigned to this appointment (many-to-many).
    public List<Mechanic> Mechanics { get; set; } = new List<Mechanic>();
}
