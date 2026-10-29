using System.Globalization;
using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.Security;

/** Resolves 'SessionRevocation:WarmupTimeoutSeconds' (env 'SessionRevocation__WarmupTimeoutSeconds'); 15 seconds when
    absent, startup fails on a blank, placeholder, non-numeric or non-positive value. */
internal static class SessionRevocationSettingsResolver
{
    private const string WarmupTimeoutKey = "SessionRevocation:WarmupTimeoutSeconds";
    private const int DefaultWarmupTimeoutSeconds = 15;

    public static TimeSpan ResolveWarmupTimeout(IConfiguration configuration)
    {
        var rawValue = configuration[WarmupTimeoutKey];

        if (rawValue is null)
        {
            return TimeSpan.FromSeconds(DefaultWarmupTimeoutSeconds);
        }

        if (TemplateMarkerDetector.ContainsTemplateMarker(rawValue))
        {
            throw new InvalidOperationException(
                $"Session revocation setting '{WarmupTimeoutKey}' still contains a template placeholder marker (for example CHANGE_ME or SET_UNIQUE_LOCAL). Replace it with a positive whole number of seconds.");
        }

        if (!int.TryParse(rawValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var seconds) || seconds <= 0)
        {
            throw new InvalidOperationException(
                $"Session revocation setting '{WarmupTimeoutKey}' must be a positive whole number of seconds when present.");
        }

        return TimeSpan.FromSeconds(seconds);
    }
}
