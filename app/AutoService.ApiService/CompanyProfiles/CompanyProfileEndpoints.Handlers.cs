using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.CompanyProfiles;

public static partial class CompanyProfileEndpoints
{
    private static async Task<IResult> GetCompanyProfileAsync(AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        var row = await db.CompanyProfiles.AsNoTracking().FirstOrDefaultAsync(cancellationToken);

        return row is null
            ? ApiProblem.NotFound("Company profile not found.")
            : Results.Ok(ToDto(row));
    }

    /** Validates, normalizes and stores the letterhead, answering with the stored values. */
    private static async Task<IResult> UpdateCompanyProfileAsync(
        CompanyProfileDto request,
        AutoServiceDbContext db,
        ICompanyProfileWriteBack writeBack,
        CancellationToken cancellationToken)
    {
        var (normalized, errors) = CompanyProfileValidator.Validate(request);
        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var row = await db.CompanyProfiles.FirstOrDefaultAsync(cancellationToken);
        if (row is null)
        {
            row = new CompanyProfileEntity();
            db.CompanyProfiles.Add(row);
        }

        row.Apply(normalized);
        await db.SaveChangesAsync(cancellationToken);
        await writeBack.WriteAsync(normalized, cancellationToken);

        return Results.Ok(ToDto(row));
    }

    private static CompanyProfileDto ToDto(CompanyProfileEntity row)
        => new(row.Name, row.AddressLine, row.PostalCode, row.City, row.TaxNumber, row.PhoneNumber, row.Email);
}
