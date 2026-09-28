namespace AutoService.ApiService.Reporting;

/** Registers the company result report route: hand-written LINQ straight into a DTO,
 * no service layer, the way AdminEndpoints lists mechanics (CLAUDE.md Company Result Anchors). */
public static partial class CompanyResultEndpoints
{
    /** Maps the company result endpoint to the route builder. */
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
