namespace AutoService.ApiService.Reporting;

/**
 * Registers the company result report route. The first aggregating endpoint in
 * the project, so it follows the closest existing pattern: hand-written LINQ
 * projected straight into a DTO, without a service layer, the way
 * AdminEndpoints lists mechanics.
 */
public static partial class CompanyResultEndpoints
{
    /**
     * Maps the company result endpoint to the route builder.
     *
     * @param endpoints Endpoint route builder.
     * @returns Route builder with the company result endpoint registered.
     */
    public static IEndpointRouteBuilder MapCompanyResultEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/company-results")
            .WithTags("CompanyResults")
            .RequireAuthorization("MechanicOnly");

        group.MapGet(string.Empty, GetCompanyResultsAsync)
            .Produces<CompanyResultDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return endpoints;
    }
}
