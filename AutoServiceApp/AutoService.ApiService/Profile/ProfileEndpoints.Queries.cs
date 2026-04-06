using AutoService.ApiService.Data;

namespace AutoService.ApiService.Profile;

public static partial class ProfileEndpoints
{
    private static async Task<IResult> GetProfileAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken);
        if (person is null)
        {
            return Results.Problem(
                detail: "Linked person record not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        return Results.Ok(new ProfileResponse(
            person.Id,
            GetPersonType(person),
            person.Name.FirstName,
            person.Name.MiddleName,
            person.Name.LastName,
            person.Email,
            person.PhoneNumber,
            person.ProfilePicture is not null));
    }
}
