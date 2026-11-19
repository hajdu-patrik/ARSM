using AutoService.ApiService.Auth.Endpoints;
using AutoService.UnitTests.Data;
using AutoService.UnitTests.Http;
using AutoService.UnitTests.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using SignInResult = Microsoft.AspNetCore.Identity.SignInResult;

namespace AutoService.UnitTests.Auth;

/** An Identity user without a mechanic row fails like a wrong password: the one invalid-credentials 401 (F3). */
public sealed class LoginMissingMechanicTests
{
    private static async Task<ProblemHttpResult> LoginAsync(SignInResult passwordCheck)
    {
        var users = new ScriptedUserManager(new IdentityUser("mechanic") { Id = "identity-5" });
        await using var db = TestDbContextFactory.Create(new NoConnectionInterceptor(), new EmptyRowsInterceptor());

        var result = await PrivateStatic.Call<Task<IResult>>(
            typeof(AuthEndpoints),
            "LoginAsync",
            new AuthEndpoints.LoginRequest("mechanic@example.com", null, "Valid-Pass-1!"),
            new DefaultHttpContext(),
            users,
            new ScriptedSignInManager(users, passwordCheck),
            db,
            null,
            NullLoggerFactory.Instance,
            CancellationToken.None);

        return Assert.IsType<ProblemHttpResult>(result);
    }

    [Fact]
    public async Task A_missing_mechanic_row_answers_the_invalid_credentials_problem()
    {
        var problem = await LoginAsync(SignInResult.Success);

        Assert.Equal(StatusCodes.Status401Unauthorized, problem.StatusCode);
        Assert.Equal("invalid_credentials", problem.ProblemDetails.Title);
        Assert.Equal("Invalid login credentials.", problem.ProblemDetails.Detail);
    }

    [Fact]
    public async Task A_missing_mechanic_row_is_indistinguishable_from_a_wrong_password()
    {
        var missingMechanic = await LoginAsync(SignInResult.Success);
        var wrongPassword = await LoginAsync(SignInResult.Failed);

        Assert.Equal(wrongPassword.StatusCode, missingMechanic.StatusCode);
        Assert.Equal(wrongPassword.ProblemDetails.Title, missingMechanic.ProblemDetails.Title);
        Assert.Equal(wrongPassword.ProblemDetails.Detail, missingMechanic.ProblemDetails.Detail);
    }
}
