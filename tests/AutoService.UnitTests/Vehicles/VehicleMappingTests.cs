using System.Linq.Expressions;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Vehicles;
using AutoService.UnitTests.Http;

namespace AutoService.UnitTests.Vehicles;

/** The vehicle detail DTO is the same whether it comes from the SQL projection or from a loaded entity. */
public sealed class VehicleMappingTests
{
    private static Vehicle Build(DrivetrainType drivetrain, string? middleName = "Mária")
    {
        var customer = PrivateStatic.WithId(new Customer(new FullName("Anna", middleName, "Kovács"), "a@example.test", null), 7);
        return PrivateStatic.WithId(
            new Vehicle("ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia", 2018, 120000, 85, drivetrain) { Customer = customer, CustomerId = 7 },
            3);
    }

    private static VehicleEndpoints.VehicleDetailDto FromEntity(Vehicle vehicle) =>
        PrivateStatic.Call<VehicleEndpoints.VehicleDetailDto>(typeof(VehicleEndpoints), "ToVehicleDetailDto", vehicle);

    private static VehicleEndpoints.VehicleDetailDto FromProjection(Vehicle vehicle)
    {
        var field = typeof(VehicleEndpoints).GetField("VehicleDetailProjection", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!;
        var projection = (Expression<Func<Vehicle, VehicleEndpoints.VehicleDetailDto>>)field.GetValue(null)!;
        return projection.Compile()(vehicle);
    }

    [Theory]
    [InlineData(DrivetrainType.Petrol, "Petrol")]
    [InlineData(DrivetrainType.Diesel, "Diesel")]
    [InlineData(DrivetrainType.Hybrid, "Hybrid")]
    [InlineData(DrivetrainType.PHEV, "PHEV")]
    [InlineData(DrivetrainType.Electric, "Electric")]
    public void FormatDrivetrainType_returns_the_enum_member_name(DrivetrainType type, string expected)
    {
        Assert.Equal(expected, PrivateStatic.Call<string>(typeof(VehicleEndpoints), "FormatDrivetrainType", type));
    }

    [Fact]
    public void The_entity_mapping_carries_the_specification_and_a_customer_summary()
    {
        var dto = FromEntity(Build(DrivetrainType.PHEV));

        Assert.Equal((3, "ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia"), (dto.Id, dto.LicensePlate, dto.Vin, dto.Brand, dto.Model));
        Assert.Equal((2018, 120000, 85, "PHEV"), (dto.Year, dto.MileageKm, dto.EnginePowerKw, dto.DrivetrainType));
        Assert.Equal(new VehicleEndpoints.CustomerSummaryDto(7, "Anna", "Mária", "Kovács"), dto.Customer);
    }

    [Theory]
    [InlineData(DrivetrainType.Petrol, "Mária")]
    [InlineData(DrivetrainType.Electric, null)]
    public void The_sql_projection_and_the_entity_mapping_produce_identical_dtos(DrivetrainType type, string? middleName)
    {
        var vehicle = Build(type, middleName);

        Assert.Equal(FromEntity(vehicle), FromProjection(vehicle));
    }
}
