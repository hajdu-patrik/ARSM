namespace AutoService.ApiService.DataProtection;

/** File-system key-ring settings resolved at startup ('DataProtection:Provider' = FileSystem). */
internal sealed record FileSystemDataProtectionSettings(string KeyDirectory);
