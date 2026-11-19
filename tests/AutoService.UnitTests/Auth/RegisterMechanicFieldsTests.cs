using AutoService.ApiService.Auth.Endpoints;
using AutoService.UnitTests.Data;
using AutoService.UnitTests.Http;
using AutoService.UnitTests.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.Auth;

/** An invalid specialization or expertise is a field error of the request check, so it is refused before any Identity write (F4). */
public sealed class RegisterMechanicFieldsTests
{
    private static AuthEndpoints.RegisterRequest Request(string specialization = "All", params string[] expertise) =>
        new("Mechanic", "Béla", null, "Szabó", "bela@example.com", "Valid-Pass-1!", null, specialization, expertise.Length == 0 ? new[] { "Engine" } : expertise);

    private static Dictionary<string, string[]> Validate(AuthEndpoints.RegisterRequest request) =>
        PrivateStatic.Call<Dictionary<string, string[]>>(typeof(AuthEndpoints), "ValidateRegisterRequest", request);

    [Fact]
    public void A_defined_specialization_and_expertise_pass()
    {
        Assert.Empty(Validate(Request("hybridAndElectric", "Engine", "brakes")));
    }

    [Theory]
    [InlineData("Rocket")]
    [InlineData("3")]
    [InlineData("All,Engine")]
    public void An_undefined_specialization_is_reported_under_Specialization(string specialization)
    {
        var errors = Validate(Request(specialization));

        Assert.Equal(["Specialization"], errors.Keys);
        Assert.Equal(["Specialization is invalid."], errors["Specialization"]);
    }

    [Theory]
    [InlineData("Teleportation")]
    [InlineData("2")]
    public void An_undefined_expertise_value_is_reported_under_Expertise_with_the_value(string invalid)
    {
        var errors = Validate(Request("All", "Engine", invalid));

        Assert.Equal(["Expertise"], errors.Keys);
        Assert.Equal([$"Expertise value '{invalid}' is invalid."], errors["Expertise"]);
    }

    [Theory]
    [InlineData("Rocket", "Engine", "Specialization")]
    [InlineData("All", "Teleportation", "Expertise")]
    public async Task The_register_handler_refuses_them_without_touching_Identity_or_the_database(
        string specialization, string expertise, string errorKey)
    {
        var users = new ScriptedUserManager(null);
        await using var db = TestDbContextFactory.Create(new DatabaseReachedInterceptor());

        var result = await PrivateStatic.Call<Task<IResult>>(
            typeof(AuthEndpoints),
            "RegisterAsync",
            Request(specialization, expertise),
            new DefaultHttpContext(),
            users,
            db,
            NullLoggerFactory.Instance,
            null,
            CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        var details = Assert.IsType<HttpValidationProblemDetails>(problem.ProblemDetails);
        Assert.Equal([errorKey], details.Errors.Keys);
        Assert.Empty(users.Calls);
    }
}
