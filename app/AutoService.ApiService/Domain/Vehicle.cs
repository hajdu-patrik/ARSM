using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;
using AutoService.ApiService.Domain.UniqueTypes;

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

    [MaxLength(17)]
    public required string Vin { get; set; }

    [MaxLength(50)]
    public required string Brand { get; set; }

    [MaxLength(50)]
    public required string Model { get; set; }

    public required int Year { get; set; }

    public required int MileageKm { get; set; }

    public required int EnginePowerKw { get; set; }

    public required DrivetrainType DrivetrainType { get; set; }

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
     * @param vin Vehicle identification number (unique).
     * @param brand Vehicle brand.
     * @param model Vehicle model.
     * @param year Vehicle production year.
     * @param mileageKm Current mileage in kilometers.
     * @param enginePowerKw Engine power in kilowatts.
     * @param drivetrainType Vehicle drivetrain energy category.
     */
    [SetsRequiredMembers]
    public Vehicle(
        string licensePlate,
        string vin,
        string brand,
        string model,
        int year,
        int mileageKm,
        int enginePowerKw,
        DrivetrainType drivetrainType)
    {
        LicensePlate = licensePlate;
        Vin = vin;
        Brand = brand;
        Model = model;
        Year = year;
        MileageKm = mileageKm;
        EnginePowerKw = enginePowerKw;
        DrivetrainType = drivetrainType;
    }
}