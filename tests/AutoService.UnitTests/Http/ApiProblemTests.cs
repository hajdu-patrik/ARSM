using AutoService.ApiService.Http;

namespace AutoService.UnitTests.Http;

/** Every shared problem helper answers its own status with the caller's detail. */
public sealed class ApiProblemTests
{
    [Fact]
    public void Unauthorized_is_401_with_the_detail()
    {
        ResultAssert.Problem(ApiProblem.Unauthorized("no session"), 401, "no session");
    }

    [Fact]
    public void Forbidden_is_403_with_the_detail()
    {
        ResultAssert.Problem(ApiProblem.Forbidden("not yours"), 403, "not yours");
    }

    [Fact]
    public void NotFound_is_404_with_the_detail()
    {
        ResultAssert.Problem(ApiProblem.NotFound("Quote not found."), 404, "Quote not found.");
    }

    [Fact]
    public void Conflict_is_409_with_the_detail()
    {
        ResultAssert.Problem(ApiProblem.Conflict("already there"), 409, "already there");
    }

    [Fact]
    public void Unprocessable_is_422_with_the_detail()
    {
        ResultAssert.Problem(ApiProblem.Unprocessable("bad field"), 422, "bad field");
    }

    [Fact]
    public void ErrorCodeResponse_carries_its_code()
    {
        var response = new ErrorCodeResponse("quote_version_conflict");

        Assert.Equal("quote_version_conflict", response.Code);
        Assert.Equal(response, new ErrorCodeResponse("quote_version_conflict"));
    }
}
