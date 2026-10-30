using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;

namespace AutoService.UnitTests.Http;

/** Reads the status, detail and `code` body of the IResult values the endpoint helpers return. */
internal static class ResultAssert
{
    internal static void Problem(IResult? result, int status, string detail)
    {
        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(status, problem.StatusCode);
        Assert.Equal(detail, problem.ProblemDetails.Detail);
    }

    internal static int? StatusOf(IResult? result) => (result as IStatusCodeHttpResult)?.StatusCode;

    /** The `code` (or `Code`) member of the result body, or null when the body has none. */
    internal static string? CodeOf(IResult? result)
    {
        var value = (result as IValueHttpResult)?.Value;
        var property = value?.GetType().GetProperty("code") ?? value?.GetType().GetProperty("Code");
        return property?.GetValue(value) as string;
    }
}
