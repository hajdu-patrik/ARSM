using AutoService.ApiService.Data;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;

namespace AutoService.ApiService.Profile.Endpoints;

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
            PersonTypeResolver.Resolve(person),
            person.Name.FirstName,
            person.Name.MiddleName,
            person.Name.LastName,
            person.Email,
            person.PhoneNumber,
            person.ProfilePicture is not null));
    }
}
