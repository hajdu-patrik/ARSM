using System.Text;

namespace AutoService.ApiService.Configuration;

/**
 * Detects template placeholder markers in configuration values
 * to prevent startup with unconfigured secrets.
 */
internal static class TemplateMarkerDetector
{
    internal static bool ContainsTemplateMarker(string value)
    {
        if (value.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase)
            || value.Contains("SET_UNIQUE_LOCAL", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var normalized = NormalizeForMarkerDetection(value);
        return normalized.Contains("CHANGEME", StringComparison.Ordinal)
            || normalized.Contains("SETUNIQUELOCAL", StringComparison.Ordinal);
    }

    private static string NormalizeForMarkerDetection(string value)
    {
        var builder = new StringBuilder(value.Length);
        foreach (var c in value)
        {
            if (char.IsLetterOrDigit(c))
            {
                builder.Append(char.ToUpperInvariant(c));
            }
        }

        return builder.ToString();
    }
}
