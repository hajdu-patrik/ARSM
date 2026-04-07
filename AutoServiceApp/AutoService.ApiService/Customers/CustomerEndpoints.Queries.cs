using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Customers;

public static partial class CustomerEndpoints
{
    private static async Task<IResult> ListCustomersAsync(
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var customers = await db.Customers
            .OrderBy(c => c.Name.LastName)
            .ThenBy(c => c.Name.FirstName)
            .Select(c => new CustomerDto(
                c.Id,
                c.Name.FirstName,
                c.Name.MiddleName,
                c.Name.LastName,
                c.Email,
                c.PhoneNumber,
                c.Vehicles.Count))
            .ToListAsync(cancellationToken);

        return Results.Ok(customers);
    }

    private static async Task<IResult> GetCustomerAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var customer = await db.Customers
            .Include(c => c.Vehicles)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer is null)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var dto = new CustomerWithVehiclesDto(
            customer.Id,
            customer.Name.FirstName,
            customer.Name.MiddleName,
            customer.Name.LastName,
            customer.Email,
            customer.PhoneNumber,
            customer.Vehicles.Select(v => new VehicleSummaryDto(
                v.Id,
                v.LicensePlate,
                v.Brand,
                v.Model,
                v.Year)).ToList());

        return Results.Ok(dto);
    }

    // Extended DTO for single-customer retrieval (includes vehicles).
    private sealed record CustomerWithVehiclesDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        IReadOnlyList<VehicleSummaryDto> Vehicles);

    private sealed record VehicleSummaryDto(
        int Id,
        string LicensePlate,
        string Brand,
        string Model,
        int Year);
}
