using AutoService.ApiService.Realtime;

namespace AutoService.ApiService.Profile.Realtime;

/** Payload published when a person's profile picture is replaced or removed. */
internal sealed record ProfilePictureUpdatedEvent(
    int PersonId,
    bool HasProfilePicture,
    long CacheBuster);

/** Fan-out channel for profile picture changes. */
internal interface IProfilePictureUpdateBroadcaster : IUpdateBroadcaster<ProfilePictureUpdatedEvent>;

/** Profile picture channel over the shared bounded fan-out. All concurrency handling lives in {@code UpdateBroadcaster<TEvent>}; this type only fixes the payload so the DI container can resolve a profile-picture-specific dependency. */
internal sealed class ProfilePictureUpdateBroadcaster
    : UpdateBroadcaster<ProfilePictureUpdatedEvent>, IProfilePictureUpdateBroadcaster;
