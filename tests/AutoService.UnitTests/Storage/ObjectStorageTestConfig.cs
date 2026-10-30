using Microsoft.Extensions.Configuration;

namespace AutoService.UnitTests.Storage;

/** Settings fixtures for the object-storage tests, and the process variables that must be cleared around them. */
internal static class ObjectStorageTestConfig
{
    public const string ClientId = "0f8fad5b-d9cb-469f-a165-70867728950e";

    public static readonly string[] Keys =
    [
        "Provider", "ServiceUrl", "Region", "BucketName", "AccessKeyId", "SecretAccessKey",
        "ForcePathStyle", "AutoCreateBucket", "DisablePayloadSigning", "DisableDefaultChecksumValidation", "ManagedIdentityClientId"
    ];

    public static readonly string[] VariableNames = Keys.Select(key => $"ObjectStorage__{key}").ToArray();

    public static Dictionary<string, string?> S3Values() => new()
    {
        ["ObjectStorage:ServiceUrl"] = "http://localhost:9000",
        ["ObjectStorage:Region"] = "us-east-1",
        ["ObjectStorage:BucketName"] = "unit-test-bucket",
        ["ObjectStorage:AccessKeyId"] = "unit-test-access",
        ["ObjectStorage:SecretAccessKey"] = "unit-test-not-a-secret",
        ["ObjectStorage:ForcePathStyle"] = "true",
        ["ObjectStorage:AutoCreateBucket"] = "false",
        ["ObjectStorage:DisablePayloadSigning"] = "true",
        ["ObjectStorage:DisableDefaultChecksumValidation"] = "false",
    };

    public static Dictionary<string, string?> AzureValues() => new()
    {
        ["ObjectStorage:Provider"] = "AzureBlob",
        ["ObjectStorage:ServiceUrl"] = "https://arsmst.blob.core.windows.net",
        ["ObjectStorage:ManagedIdentityClientId"] = ClientId,
        ["ObjectStorage:BucketName"] = "arsm-profile-pictures",
        ["ObjectStorage:AutoCreateBucket"] = "true",
    };

    public static IConfiguration Build(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();
}
