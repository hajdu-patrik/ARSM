using AutoService.ApiService.Common;

namespace AutoService.ApiService.Auth;

public static partial class AuthEndpoints
{
    internal static bool TryNormalizeHungarianPhoneNumber(string? rawValue, out string normalizedPhoneNumber)
        => ContactNormalization.TryNormalizeHungarianPhoneNumber(rawValue, out normalizedPhoneNumber);

    private static IReadOnlyCollection<string> BuildHungarianPhoneLookupCandidates(string normalizedPhoneNumber)
        => ContactNormalization.BuildHungarianPhoneLookupCandidates(normalizedPhoneNumber);
}
