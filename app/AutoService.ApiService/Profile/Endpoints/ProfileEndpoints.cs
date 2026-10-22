using AutoService.ApiService.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
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
            .ProducesProblem(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status401Unauthorized);

        // Both verify the current password, so both count toward the lockout and share the per-person limit.
        group.MapDelete(string.Empty, DeleteProfileAsync)
            .RequireRateLimiting(RateLimitPolicies.ProfileCredentials)
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesValidationProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<object>(StatusCodes.Status429TooManyRequests);

        group.MapPost("/change-password", ChangePasswordAsync)
            .RequireRateLimiting(RateLimitPolicies.ProfileCredentials)
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesValidationProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<object>(StatusCodes.Status429TooManyRequests);

        group.MapGet("/picture", GetProfilePictureAsync)
            .Produces(StatusCodes.Status200OK, contentType: "image/jpeg")
            .Produces(StatusCodes.Status200OK, contentType: "image/png")
            .Produces(StatusCodes.Status200OK, contentType: "image/webp")
            .Produces(StatusCodes.Status304NotModified)
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
            .Produces(StatusCodes.Status304NotModified)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        // The size metadata lifts the 64 KB global body limit for this route only and makes Kestrel reject an oversized
        // body while it is still on the wire, before the multipart payload is buffered.
        group.MapPut("/picture", UploadProfilePictureAsync)
            .DisableAntiforgery()
            .RequireRateLimiting(RateLimitPolicies.ProfilePictureUpload)
            .WithMetadata(new RequestSizeLimitAttribute(MaxProfilePictureRequestBytes))
            .WithMetadata(new RequestFormLimitsAttribute { MultipartBodyLengthLimit = MaxProfilePictureRequestBytes })
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesValidationProblem(StatusCodes.Status400BadRequest)
            .ProducesValidationProblem(StatusCodes.Status422UnprocessableEntity)
            .Produces(StatusCodes.Status413PayloadTooLarge)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status429TooManyRequests);

        group.MapDelete("/picture", DeleteProfilePictureAsync)
            .Produces<object>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        return endpoints;
    }
}
