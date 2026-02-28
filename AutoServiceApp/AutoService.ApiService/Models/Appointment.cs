using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using AutoService.ApiService.Models.UniqueTypes;

namespace AutoService.ApiService.Models;

/**
 * Service appointment entity linked to a vehicle and one or more mechanics.
 */
public class Appointment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }

    public DateTime ScheduledDate { get; set; }
    
    [MaxLength(200)]
    public required string TaskDescription { get; set; }

    public ProgresStatus Status { get; set; } = ProgresStatus.Scheduled;


    // Relationship: each appointment belongs to one vehicle.
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    // Mechanics assigned to this appointment.
    public List<Mechanic> Mechanics { get; set; } = new List<Mechanic>();
}