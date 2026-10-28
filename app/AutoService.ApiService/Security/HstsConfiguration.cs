using Microsoft.AspNetCore.HttpsPolicy;

namespace AutoService.ApiService.Security;

/** HSTS values behind app.UseHsts(): 365 days, subdomains included, no browser preload list. */
internal static class HstsConfiguration
{
    internal static void Configure(HstsOptions options)
    {
        options.MaxAge = TimeSpan.FromDays(365);
        options.IncludeSubDomains = true;
        options.Preload = false;
    }
}
