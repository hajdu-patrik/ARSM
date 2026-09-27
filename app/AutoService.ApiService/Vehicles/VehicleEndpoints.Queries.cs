using System.Linq.Expressions;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pagination;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Vehicles;

public static partial class VehicleEndpoints
{
    /**
     * Server-side projection of a vehicle into its detail DTO.
     *
     * Mirrors {@code ToVehicleDetailDto} field for field so query and mutation responses serialize
     * identically, but fetches only the mapped vehicle and owner-name columns. The drivetrain name is
     * formatted by a static helper that EF Core evaluates on the client in the top-level projection.
     */
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

    /**
     * Returns the vehicles owned by a customer, capped at the shared list limit.
     *
     * @param customerId Owning customer identifier.
     * @param limit Optional maximum row count, normalized by {@code ListQueryLimits.Normalize}.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns Vehicle list ordered by brand, model and id, or 404 if the customer does not exist.
     */
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

    /**
     * Returns a single vehicle with its owner summary.
     *
     * @param id Vehicle identifier.
     * @param db Database context.
     * @param cancellationToken Request cancellation token.
     * @returns The vehicle detail or 404 if it does not exist.
     */
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

    /**
     * Returns the drivetrain enum member name exactly like {@code Enum.ToString()}; EF Core evaluates it client-side.
     *
     * @param drivetrainType Materialized drivetrain value.
     * @returns The drivetrain member name.
     */
    private static string FormatDrivetrainType(DrivetrainType drivetrainType) => drivetrainType.ToString();

    /**
     * Maps a tracked/loaded {@code Vehicle} entity into its detail DTO for mutation responses.
     *
     * Mirrors {@code VehicleDetailProjection} field for field so query and mutation responses
     * serialize identically.
     *
     * @param vehicle Loaded vehicle entity with its owning customer included.
     * @returns The vehicle detail DTO.
     */
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
