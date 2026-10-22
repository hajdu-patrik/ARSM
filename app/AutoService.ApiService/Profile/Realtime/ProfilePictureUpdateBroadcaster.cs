using AutoService.ApiService.Realtime;

namespace AutoService.ApiService.Profile.Realtime;

/** Payload published when a person's profile picture is replaced or removed. */
internal sealed record ProfilePictureUpdatedEvent(
    int PersonId,
    bool HasProfilePicture,
    long CacheBuster);

internal interface IProfilePictureUpdateBroadcaster : IUpdateBroadcaster<ProfilePictureUpdatedEvent>;

/** Profile picture channel over the shared bounded fan-out; it only fixes the payload type so DI can resolve it. */
internal sealed class ProfilePictureUpdateBroadcaster
    : UpdateBroadcaster<ProfilePictureUpdatedEvent>, IProfilePictureUpdateBroadcaster;
