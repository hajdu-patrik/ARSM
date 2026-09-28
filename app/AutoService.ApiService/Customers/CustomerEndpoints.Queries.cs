using AutoService.ApiService.Data;
using AutoService.ApiService.Pagination;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Customers;

public static partial class CustomerEndpoints
{
    /** Returns customers with vehicle count/plates, capped at the shared list limit; plates are
     * sorted in memory (kept on .NET string comparison, not DB collation). */
    private static async Task<IResult> ListCustomersAsync(
        int? limit,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var customers = await db.Customers
            .AsNoTracking()
            .OrderBy(c => c.Name.LastName)
            .ThenBy(c => c.Name.FirstName)
            .ThenBy(c => c.Id)
            .Take(ListQueryLimits.Normalize(limit))
            .Select(c => new
            {
                c.Id,
                c.Name.FirstName,
                c.Name.MiddleName,
                c.Name.LastName,
                c.Email,
                c.PhoneNumber,
                LicensePlates = c.Vehicles.Select(v => v.LicensePlate).ToList(),
            })
            .ToListAsync(cancellationToken);

        var customerDtos = customers
            .Select(c => new CustomerDto(
                c.Id,
                c.FirstName,
                c.MiddleName,
                c.LastName,
                c.Email,
                c.PhoneNumber,
                c.LicensePlates.Count,
                c.LicensePlates
                    .OrderBy(plate => plate)
                    .ToList()))
            .ToList();

        return Results.Ok(customerDtos);
    }

    /** Returns a single customer with vehicle summaries, projected straight into the DTO. */
    private static async Task<IResult> GetCustomerAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var dto = await db.Customers
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new CustomerWithVehiclesDto(
                c.Id,
                c.Name.FirstName,
                c.Name.MiddleName,
                c.Name.LastName,
                c.Email,
                c.PhoneNumber,
                c.Vehicles.Select(v => new VehicleSummaryDto(
                    v.Id,
                    v.LicensePlate,
                    v.Brand,
                    v.Model,
                    v.Year)).ToList()))
            .FirstOrDefaultAsync(cancellationToken);

        if (dto is null)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        return Results.Ok(dto);
    }
}
