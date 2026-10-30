using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Vehicles;

namespace AutoService.UnitTests.Vehicles;

/** The vehicle field checks in their fixed order, the nested-payload prefix and the entity mapping. */
public sealed class VehicleInputTests
{
    private static VehicleInput Input(
        string plate = "ABC-123", string vin = "WVWZZZAUZJW123456", string brand = "Škoda", string model = "Octavia",
        int year = 2018, int mileage = 120000, int power = 85, string drivetrain = "Diesel") =>
        new(plate, vin, brand, model, year, mileage, power, drivetrain);

    [Fact]
    public void GetFieldError_is_null_for_a_complete_vehicle()
    {
        Assert.Null(Input().GetFieldError());
    }

    [Theory]
    [InlineData("", "WVWZZZAUZJW123456", "Škoda", "Octavia", "Diesel")]
    [InlineData("ABC-123", "  ", "Škoda", "Octavia", "Diesel")]
    [InlineData("ABC-123", "WVWZZZAUZJW123456", "", "Octavia", "Diesel")]
    [InlineData("ABC-123", "WVWZZZAUZJW123456", "Škoda", " ", "Diesel")]
    [InlineData("ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia", "")]
    public void GetFieldError_requires_plate_vin_brand_model_and_drivetrain(
        string plate, string vin, string brand, string model, string drivetrain)
    {
        Assert.Equal(
            "LicensePlate, Vin, Brand, Model, and DrivetrainType are required.",
            Input(plate, vin, brand, model, drivetrain: drivetrain).GetFieldError());
    }

    [Fact]
    public void GetFieldError_puts_the_prefix_in_front_of_every_field_name()
    {
        Assert.Equal(
            "Vehicle.LicensePlate, Vehicle.Vin, Vehicle.Brand, Vehicle.Model, and Vehicle.DrivetrainType are required.",
            Input(plate: "").GetFieldError("Vehicle."));
    }

    [Fact]
    public void GetFieldError_allows_the_maximum_lengths_measured_after_trimming()
    {
        Assert.Null(Input(plate: " " + new string('1', 20) + " ", brand: new string('b', 50), model: new string('m', 50)).GetFieldError());
    }

    [Fact]
    public void GetFieldError_rejects_a_plate_brand_or_model_over_its_column_cap()
    {
        Assert.Equal("LicensePlate must be at most 20 characters.", Input(plate: new string('1', 21)).GetFieldError());
        Assert.Equal("Brand must be at most 50 characters.", Input(brand: new string('b', 51)).GetFieldError());
        Assert.Equal("Model must be at most 50 characters.", Input(model: new string('m', 51)).GetFieldError());
    }

    [Fact]
    public void GetFieldError_checks_the_year_then_the_mileage_and_power()
    {
        Assert.Equal("Year must be between 1886 and 2100.", Input(year: 1700, mileage: -1).GetFieldError());
        Assert.Equal("Vehicle.Year must be between 1886 and 2100.", Input(year: 3000).GetFieldError("Vehicle."));
        Assert.Equal("MileageKm and EnginePowerKw must be non-negative.", Input(mileage: -1).GetFieldError());
        Assert.Equal(
            "MileageKm must be <= 1000000 and EnginePowerKw must be <= 50000.",
            Input(power: 50_001).GetFieldError());
    }

    [Fact]
    public void ToEntity_trims_brand_and_model_and_takes_the_normalized_plate_vin_and_drivetrain()
    {
        var vehicle = Input(plate: "abc-123", brand: " Škoda ", model: " Octavia ").ToEntity("ABC-123", "WVWZZZAUZJW123456", DrivetrainType.Hybrid);

        Assert.Equal(("ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia"), (vehicle.LicensePlate, vehicle.Vin, vehicle.Brand, vehicle.Model));
        Assert.Equal((2018, 120000, 85, DrivetrainType.Hybrid), (vehicle.Year, vehicle.MileageKm, vehicle.EnginePowerKw, vehicle.DrivetrainType));
    }

    [Fact]
    public void ApplyTo_overwrites_every_field_of_an_existing_vehicle_but_not_its_owner()
    {
        var vehicle = new Vehicle("OLD-111", "11111111111111111", "Opel", "Astra", 2000, 1, 1, DrivetrainType.Petrol) { CustomerId = 9 };

        Input(brand: " Škoda ", year: 2020, mileage: 5, power: 99).ApplyTo(vehicle, "NEW-222", "WVWZZZAUZJW123456", DrivetrainType.Electric);

        Assert.Equal(("NEW-222", "WVWZZZAUZJW123456", "Škoda", "Octavia"), (vehicle.LicensePlate, vehicle.Vin, vehicle.Brand, vehicle.Model));
        Assert.Equal((2020, 5, 99, DrivetrainType.Electric), (vehicle.Year, vehicle.MileageKm, vehicle.EnginePowerKw, vehicle.DrivetrainType));
        Assert.Equal(9, vehicle.CustomerId);
    }

    [Fact]
    public void The_create_update_and_nested_requests_map_field_for_field_to_the_input()
    {
        var create = new VehicleEndpoints.CreateVehicleRequest("P-1", "V", "B", "M", 2001, 2, 3, "Diesel").ToInput();
        var update = new VehicleEndpoints.UpdateVehicleRequest("P-1", "V", "B", "M", 2001, 2, 3, "Diesel").ToInput();

        Assert.Equal(new VehicleInput("P-1", "V", "B", "M", 2001, 2, 3, "Diesel"), create);
        Assert.Equal(create, update);
    }
}
