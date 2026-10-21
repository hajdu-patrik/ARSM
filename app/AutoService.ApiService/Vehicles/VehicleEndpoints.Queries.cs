using System.Linq.Expressions;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pagination;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel;
using AutoService.ApiService.Http;

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

    /** Returns the vehicles owned by a customer, one page, ordered by brand, model, id. */
    private static async Task<IResult> ListCustomerVehiclesAsync(
        int customerId,
        [Description("1-based page number; values below 1 become 1. Default 1.")] int? page,
        [Description("Page size, clamped to 1..500. Default 20.")] int? pageSize,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var customerExists = await db.Customers
            .AnyAsync(c => c.Id == customerId, cancellationToken);

        if (!customerExists)
        {
            return ApiProblem.NotFound("Customer not found.");
        }

        var request = ListQueryLimits.NormalizePage(page, pageSize);
        var vehicles = await db.Vehicles
            .AsNoTracking()
            .Where(v => v.CustomerId == customerId)
            .OrderBy(v => v.Brand)
            .ThenBy(v => v.Model)
            .ThenBy(v => v.Id)
            .Select(VehicleDetailProjection)
            .ToPagedResultAsync(request, cancellationToken);

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
            return ApiProblem.NotFound("Vehicle not found.");
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
