using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Identity;
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

        return Results.Ok(ToProfileResponse(person));
    }

    /** Maps a person to the profile response shared by the GET and PUT handlers. */
    private static ProfileResponse ToProfileResponse(People person) => new(
        person.Id,
        PersonTypeResolver.Resolve(person),
        person.Name.FirstName,
        person.Name.MiddleName,
        person.Name.LastName,
        person.Email,
        person.PhoneNumber,
        ProjectionFormat.HasProfilePicture(person.ProfilePictureObjectKey));
}
