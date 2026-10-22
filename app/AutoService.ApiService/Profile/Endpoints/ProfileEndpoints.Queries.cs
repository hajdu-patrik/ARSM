using AutoService.ApiService.Data;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    /** Retrieves the authenticated user's profile without tracking because this read path does not mutate the person record. */
    private static async Task<IResult> GetProfileAsync(
        HttpContext httpContext,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var person = await ResolveCurrentPersonAsync(httpContext, db, cancellationToken, trackChanges: false);
        if (person is null)
        {
            return ApiProblem.NotFound("Linked person record not found.");
        }

        return Results.Ok(new ProfileResponse(
            person.Id,
            PersonTypeResolver.Resolve(person),
            person.Name.FirstName,
            person.Name.MiddleName,
            person.Name.LastName,
            person.Email,
            person.PhoneNumber,
            person.ProfilePictureObjectKey is not null || person.ProfilePictureContentType is not null));
    }
}
