using System.Linq.Expressions;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pagination;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Vehicles;

public static partial class VehicleEndpoints
{
    /** Server-side projection of a vehicle into its detail DTO; mirrors ToVehicleDetailDto field for
     * field so query/mutation responses serialize identically, fetching only the mapped columns. */
    private static readonly Expression<Func<Vehicle, VehicleDetailDto>> VehicleDetailProjection = v => new VehicleDetailDto(
        v.Id,
        v.LicensePlate,
        v.Vin,
        v.Brand,
        v.Model,
        v.Year,
        v.MileageKm,
        v.EnginePowerKw,
        FormatDrivetrainType(v.DrivetrainType),
        new CustomerSummaryDto(
            v.Customer.Id,
            v.Customer.Name.FirstName,
            v.Customer.Name.MiddleName,
            v.Customer.Name.LastName));

    /** Returns the vehicles owned by a customer, capped at the shared list limit. */
    private static async Task<IResult> ListCustomerVehiclesAsync(
        int customerId,
        int? limit,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var customerExists = await db.Customers
            .AnyAsync(c => c.Id == customerId, cancellationToken);

        if (!customerExists)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var vehicles = await db.Vehicles
            .AsNoTracking()
            .Where(v => v.CustomerId == customerId)
            .OrderBy(v => v.Brand)
            .ThenBy(v => v.Model)
            .ThenBy(v => v.Id)
            .Take(ListQueryLimits.Normalize(limit))
            .Select(VehicleDetailProjection)
            .ToListAsync(cancellationToken);

        return Results.Ok(vehicles);
    }

    /** Returns a single vehicle with its owner summary. */
    private static async Task<IResult> GetVehicleAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var vehicle = await db.Vehicles
            .AsNoTracking()
            .Where(v => v.Id == id)
            .Select(VehicleDetailProjection)
            .FirstOrDefaultAsync(cancellationToken);

        if (vehicle is null)
        {
            return Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        return Results.Ok(vehicle);
    }

    /** Returns the drivetrain enum member name exactly like Enum.ToString(); EF Core evaluates it client-side. */
    private static string FormatDrivetrainType(DrivetrainType drivetrainType) => drivetrainType.ToString();

    /** Maps a tracked/loaded Vehicle entity into its detail DTO for mutation responses; mirrors VehicleDetailProjection field for field. */
    private static VehicleDetailDto ToVehicleDetailDto(Vehicle vehicle) => new(
            vehicle.Id,
            vehicle.LicensePlate,
            vehicle.Vin,
            vehicle.Brand,
            vehicle.Model,
            vehicle.Year,
            vehicle.MileageKm,
            vehicle.EnginePowerKw,
            vehicle.DrivetrainType.ToString(),
            new CustomerSummaryDto(
                vehicle.Customer.Id,
                vehicle.Customer.Name.FirstName,
                vehicle.Customer.Name.MiddleName,
                vehicle.Customer.Name.LastName));
}
