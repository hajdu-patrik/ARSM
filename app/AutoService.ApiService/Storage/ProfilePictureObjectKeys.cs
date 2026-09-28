namespace AutoService.ApiService.Storage;

/** Object-key format shared by every storage provider: a fresh GUID-suffixed key per save, scoped to the person. */
internal static class ProfilePictureObjectKeys
{
    private const string ObjectKeyPrefix = "profile-pictures";
    private const string ObjectKeyExtension = ".webp";

    /** Builds a collision-free object key, so readers never race a replacement under an unchanged URL. */
    public static string Create(int personId)
        => $"{ObjectKeyPrefix}/{personId}/{Guid.NewGuid():N}{ObjectKeyExtension}";
}
