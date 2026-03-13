using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using AutoService.ApiService.Models.UniqueTypes;

namespace AutoService.ApiService.Models;

/**
 * Service appointment entity linked to a vehicle and one or more mechanics.
 * The many-to-many relationship with Mechanic is persisted via the
 * `appointmentmechanics` join table managed by EF Core.
 */
public class Appointment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }

    // UTC timestamp of the planned service date.
    public DateTime ScheduledDate { get; set; }
    
    [MaxLength(200)]
    public required string TaskDescription { get; set; }

    // Defaults to Scheduled on creation; updated as the appointment progresses.
    public ProgresStatus Status { get; set; } = ProgresStatus.Scheduled;


    // Relationship: each appointment belongs to exactly one vehicle.
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    // Mechanics assigned to this appointment (many-to-many).
    public List<Mechanic> Mechanics { get; set; } = new List<Mechanic>();
}