using AutoService.ApiService.Data;
using AutoService.ApiService.Pagination;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Customers;

public static partial class CustomerEndpoints
{
    /** Returns one page of customers with vehicle count/plates; plates are sorted in memory
     * (kept on .NET string comparison, not DB collation). */
    private static async Task<IResult> ListCustomersAsync(
        [Description("1-based page number; values below 1 become 1. Default 1.")] int? page,
        [Description("Page size, clamped to 1..500. Default 20.")] int? pageSize,
        [Description("Optional case-insensitive substring filter, trimmed, max 100 characters.")] string? search,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var request = ListQueryLimits.NormalizePage(page, pageSize);

        var query = db.Customers.AsNoTracking();
        var term = SearchTerm.Normalize(search);
        if (term is not null)
        {
            query = query.Where(CustomerSearchPredicate(term));
        }

        var ordered = query.OrderBy(c => c.Name.LastName)
            .ThenBy(c => c.Name.FirstName)
            .ThenBy(c => c.Id);

        var result = await ordered
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
            .ToPagedResultAsync(request, cancellationToken);

        var customerDtos = result.Items
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

        return Results.Ok(new PagedResult<CustomerDto>(customerDtos, result.TotalCount, result.Page, result.PageSize));
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
            return ApiProblem.NotFound("Customer not found.");
        }

        return Results.Ok(dto);
    }
}
