namespace AutoService.ApiService.CompanyProfiles;

/** Registers the Admin-only company letterhead routes under /api/admin/company-profile. */
public static partial class CompanyProfileEndpoints
{
    public static IEndpointRouteBuilder MapCompanyProfileEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/admin/company-profile")
            .WithTags("CompanyProfile")
            .RequireAuthorization("AdminOnly");

        group.MapGet(string.Empty, GetCompanyProfileAsync)
            .Produces<CompanyProfileDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        group.MapPut(string.Empty, UpdateCompanyProfileAsync)
            .Produces<CompanyProfileDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return endpoints;
    }
}
