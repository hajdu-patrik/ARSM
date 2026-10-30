using AutoService.ApiService.Storage;
using AutoService.UnitTests.Configuration;
using static AutoService.UnitTests.Storage.ObjectStorageTestConfig;

namespace AutoService.UnitTests.Storage;

/** Provider selection and the S3 settings set: environment over config, every setting required, flags strict. */
[Collection(ProcessEnvironmentCollection.Name)]
public sealed class ObjectStorageResolutionTests : IDisposable
{
    private readonly ProcessEnvironmentScope environment = new(VariableNames);

    public void Dispose() => environment.Dispose();

    private static ObjectStorageProvider Provider(string? value) =>
        ObjectStorageSettingsResolver.ResolveProvider(Build(new() { ["ObjectStorage:Provider"] = value }));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("S3")]
    [InlineData("s3")]
    public void An_unset_or_s3_provider_selects_s3(string? value)
    {
        Assert.Equal(ObjectStorageProvider.S3, Provider(value));
    }

    [Theory]
    [InlineData("AzureBlob")]
    [InlineData("azureblob")]
    [InlineData(" AZUREBLOB ")]
    public void The_azure_blob_provider_is_matched_ignoring_case_and_spaces(string value)
    {
        Assert.Equal(ObjectStorageProvider.AzureBlob, Provider(value));
    }

    [Theory]
    [InlineData("Redis")]
    [InlineData("Azure Blob")]
    [InlineData("CHANGE_ME")]
    public void An_unknown_provider_fails_startup(string value)
    {
        var exception = Assert.Throws<InvalidOperationException>(() => Provider(value));

        Assert.Contains("must be 'S3' or 'AzureBlob'", exception.Message);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData("5")]
    public void A_numeric_provider_fails_startup_like_any_other_unknown_name(string value)
    {
        Assert.Throws<InvalidOperationException>(() => Provider(value));
    }

    [Fact]
    public void An_environment_provider_wins_over_configuration()
    {
        environment.Set("ObjectStorage__Provider", "AzureBlob");

        Assert.Equal(ObjectStorageProvider.AzureBlob, Provider("S3"));
    }

    [Fact]
    public void All_nine_s3_settings_resolve()
    {
        var settings = ObjectStorageSettingsResolver.Resolve(Build(S3Values()));

        Assert.Equal(
            new ObjectStorageSettings("http://localhost:9000", "us-east-1", "unit-test-bucket", "unit-test-access", "unit-test-not-a-secret", true, false, true, false),
            settings);
    }

    [Fact]
    public void An_environment_value_wins_over_configuration_and_a_blank_one_does_not()
    {
        environment.Set("ObjectStorage__BucketName", "from-environment");
        environment.Set("ObjectStorage__Region", "  ");

        var settings = ObjectStorageSettingsResolver.Resolve(Build(S3Values()));

        Assert.Equal("from-environment", settings.BucketName);
        Assert.Equal("us-east-1", settings.Region);
    }

    [Theory]
    [InlineData("ServiceUrl")]
    [InlineData("Region")]
    [InlineData("BucketName")]
    [InlineData("AccessKeyId")]
    [InlineData("SecretAccessKey")]
    [InlineData("ForcePathStyle")]
    [InlineData("AutoCreateBucket")]
    [InlineData("DisablePayloadSigning")]
    [InlineData("DisableDefaultChecksumValidation")]
    public void A_missing_s3_setting_fails_startup_naming_the_key(string key)
    {
        var values = S3Values();
        values.Remove($"ObjectStorage:{key}");

        var exception = Assert.Throws<InvalidOperationException>(() => ObjectStorageSettingsResolver.Resolve(Build(values)));

        Assert.Contains($"ObjectStorage:{key}", exception.Message);
        Assert.Contains("is missing", exception.Message);
    }

    [Theory]
    [InlineData("ForcePathStyle", "yes")]
    [InlineData("AutoCreateBucket", "1")]
    [InlineData("DisablePayloadSigning", "maybe")]
    public void A_flag_that_is_not_true_or_false_fails_startup(string key, string value)
    {
        var values = S3Values();
        values[$"ObjectStorage:{key}"] = value;

        var exception = Assert.Throws<InvalidOperationException>(() => ObjectStorageSettingsResolver.Resolve(Build(values)));

        Assert.Contains("must be 'true' or 'false'", exception.Message);
    }

    [Fact]
    public void A_flag_is_matched_ignoring_case()
    {
        var values = S3Values();
        values["ObjectStorage:ForcePathStyle"] = "TRUE";
        values["ObjectStorage:AutoCreateBucket"] = "False";

        var settings = ObjectStorageSettingsResolver.Resolve(Build(values));

        Assert.True(settings.ForcePathStyle);
        Assert.False(settings.AutoCreateBucket);
    }

    [Fact]
    public void A_placeholder_value_fails_startup_without_echoing_it()
    {
        var values = S3Values();
        values["ObjectStorage:SecretAccessKey"] = "CHANGE_ME_secret";

        var exception = Assert.Throws<InvalidOperationException>(() => ObjectStorageSettingsResolver.Resolve(Build(values)));

        Assert.Contains("template placeholder marker", exception.Message);
        Assert.DoesNotContain("CHANGE_ME_secret", exception.Message);
    }

    [Fact]
    public void The_azure_flag_and_container_name_are_required_and_the_client_id_is_canonicalized()
    {
        var values = AzureValues();
        values["ObjectStorage:ManagedIdentityClientId"] = "{" + ClientId.ToUpperInvariant() + "}";
        Assert.Equal(ClientId, ObjectStorageSettingsResolver.ResolveAzureBlob(Build(values)).ManagedIdentityClientId);

        foreach (var key in new[] { "BucketName", "AutoCreateBucket" })
        {
            var missing = AzureValues();
            missing.Remove($"ObjectStorage:{key}");
            Assert.Throws<InvalidOperationException>(() => ObjectStorageSettingsResolver.ResolveAzureBlob(Build(missing)));
        }
    }
}
