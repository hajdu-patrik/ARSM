using AutoService.ApiService.Security;
using Microsoft.AspNetCore.HttpsPolicy;

namespace AutoService.UnitTests.Security;

/** The HSTS middleware never answers localhost, so the options are pinned here. */
public sealed class HstsConfigurationTests
{
    [Fact]
    public void Configure_SetsOneYearIncludeSubDomainsAndNoPreload()
    {
        var options = new HstsOptions();

        HstsConfiguration.Configure(options);

        Assert.Equal(TimeSpan.FromDays(365), options.MaxAge);
        Assert.True(options.IncludeSubDomains);
        Assert.False(options.Preload);
    }
}
