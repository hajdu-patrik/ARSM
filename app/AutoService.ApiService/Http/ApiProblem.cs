namespace AutoService.ApiService.Http;

/** The RFC 7807 problem responses the endpoints share, so no handler spells out a status code per call site. */
internal static class ApiProblem
{
    internal static IResult Unauthorized(string detail) => Create(detail, StatusCodes.Status401Unauthorized);

    internal static IResult Forbidden(string detail) => Create(detail, StatusCodes.Status403Forbidden);

    internal static IResult NotFound(string detail) => Create(detail, StatusCodes.Status404NotFound);

    internal static IResult Conflict(string detail) => Create(detail, StatusCodes.Status409Conflict);

    internal static IResult Unprocessable(string detail) => Create(detail, StatusCodes.Status422UnprocessableEntity);

    private static IResult Create(string detail, int statusCode) => Results.Problem(detail: detail, statusCode: statusCode);
}
