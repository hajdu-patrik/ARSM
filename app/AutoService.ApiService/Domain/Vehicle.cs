/**
 * Vehicle.cs
 *
 * Auto-generated documentation header for this source file.
 */

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;

namespace AutoService.ApiService.Domain;

/**
 * Vehicle entity owned by a customer.
 */
public class Vehicle
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }

    [MaxLength(20)]
    public required string LicensePlate { get; set; }

    [MaxLength(50)]
    public required string Brand { get; set; }

    [MaxLength(50)]
    public required string Model { get; set; }

    public required int Year { get; set; }

    public required int MileageKm { get; set; }

    public required int EnginePowerHp { get; set; }

    public required int EngineTorqueNm { get; set; }


    // Relationship: each vehicle has exactly one owner.
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    // Appointments associated with this vehicle.
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();

    /**
     * Parameterless constructor required by EF Core.
     */
    public Vehicle() {}

    /**
     * Creates a vehicle with required technical fields.
     *
     * @param licensePlate Vehicle license plate (unique).
     * @param brand Vehicle brand.
     * @param model Vehicle model.
     * @param year Vehicle production year.
     * @param mileageKm Current mileage in kilometers.
     * @param enginePowerHp Engine power in horsepower.
     * @param engineTorqueNm Engine torque in newton-meters.
     */
    [SetsRequiredMembers]
    public Vehicle(string licensePlate, string brand, string model, int year, int mileageKm, int enginePowerHp, int engineTorqueNm)
    {
        LicensePlate = licensePlate;
        Brand = brand;
        Model = model;
        Year = year;
        MileageKm = mileageKm;
        EnginePowerHp = enginePowerHp;
        EngineTorqueNm = engineTorqueNm;
    }
}