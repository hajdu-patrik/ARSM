/**
 * ProfileEndpoints.cs
 *
 * Auto-generated documentation header for this source file.
 */

using Microsoft.AspNetCore.Routing;

namespace AutoService.ApiService.Profile.Endpoints;

/**
 * Registers profile routes under the /api/profile group.
 * Handler logic is split into dedicated partial files.
 */
public static partial class ProfileEndpoints
{
        /**
         * MapProfileEndpoints operation.
         *
         * @param endpoints Parameter.
         * @returns Return value.
         */
        public static IEndpointRouteBuilder MapProfileEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/profile").WithTags("Profile").RequireAuthorization();

        group.MapGet(string.Empty, GetProfileAsync);
        group.MapPut(string.Empty, UpdateProfileAsync);
        group.MapDelete(string.Empty, DeleteProfileAsync);
        group.MapPost("/change-password", ChangePasswordAsync);
        group.MapGet("/picture", GetProfilePictureAsync);
        group.MapGet("/picture/updates", StreamProfilePictureUpdatesAsync);
        group.MapGet("/picture/{personId:int}", GetMechanicProfilePictureAsync);
        group.MapPut("/picture", UploadProfilePictureAsync).DisableAntiforgery();
        group.MapDelete("/picture", DeleteProfilePictureAsync);

        return endpoints;
    }
}
