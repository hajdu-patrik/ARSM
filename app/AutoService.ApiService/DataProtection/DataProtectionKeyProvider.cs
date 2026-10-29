namespace AutoService.ApiService.DataProtection;

/** DataProtection key-ring backend selected by 'DataProtection:Provider'. */
internal enum DataProtectionKeyProvider
{
    FileSystem,
    AzureBlob
}
