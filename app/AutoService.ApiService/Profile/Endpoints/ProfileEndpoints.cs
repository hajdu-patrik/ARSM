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

            group.MapGet(string.Empty, GetProfileAsync)
                .Produces<ProfileResponse>(StatusCodes.Status200OK)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .Produces(StatusCodes.Status401Unauthorized);

            group.MapPut(string.Empty, UpdateProfileAsync)
                .Produces<ProfileResponse>(StatusCodes.Status200OK)
                .ProducesValidationProblem(StatusCodes.Status400BadRequest)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .Produces(StatusCodes.Status401Unauthorized);

            group.MapDelete(string.Empty, DeleteProfileAsync)
                .Produces<object>(StatusCodes.Status200OK)
                .ProducesValidationProblem(StatusCodes.Status400BadRequest)
                .ProducesProblem(StatusCodes.Status403Forbidden)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .Produces(StatusCodes.Status401Unauthorized);

            group.MapPost("/change-password", ChangePasswordAsync)
                .Produces<object>(StatusCodes.Status200OK)
                .ProducesValidationProblem(StatusCodes.Status400BadRequest)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .Produces(StatusCodes.Status401Unauthorized);

            group.MapGet("/picture", GetProfilePictureAsync)
                .Produces(StatusCodes.Status200OK, contentType: "image/jpeg")
                .Produces(StatusCodes.Status200OK, contentType: "image/png")
                .Produces(StatusCodes.Status200OK, contentType: "image/webp")
                .Produces(StatusCodes.Status404NotFound)
                .Produces(StatusCodes.Status401Unauthorized);

            group.MapGet("/picture/updates", StreamProfilePictureUpdatesAsync)
                .Produces(StatusCodes.Status200OK, contentType: "text/event-stream")
                .ProducesProblem(StatusCodes.Status503ServiceUnavailable)
                .Produces(StatusCodes.Status401Unauthorized);

            group.MapGet("/picture/{personId:int}", GetMechanicProfilePictureAsync)
                .Produces(StatusCodes.Status200OK, contentType: "image/jpeg")
                .Produces(StatusCodes.Status200OK, contentType: "image/png")
                .Produces(StatusCodes.Status200OK, contentType: "image/webp")
                .Produces(StatusCodes.Status404NotFound)
                .Produces(StatusCodes.Status401Unauthorized);

            group.MapPut("/picture", UploadProfilePictureAsync)
                .DisableAntiforgery()
                .Produces<object>(StatusCodes.Status200OK)
                .ProducesValidationProblem(StatusCodes.Status400BadRequest)
                .ProducesValidationProblem(StatusCodes.Status422UnprocessableEntity)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .Produces(StatusCodes.Status401Unauthorized);

            group.MapDelete("/picture", DeleteProfilePictureAsync)
                .Produces<object>(StatusCodes.Status200OK)
                .ProducesProblem(StatusCodes.Status404NotFound)
                .Produces(StatusCodes.Status401Unauthorized);

        return endpoints;
    }
}
