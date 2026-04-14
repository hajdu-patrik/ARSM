/**
 * AuthEndpoints.PhoneNormalization.cs
 *
 * Auto-generated documentation header for this source file.
 */

using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;

namespace AutoService.ApiService.Auth.Endpoints;

/**
 * Backend type for API logic in this file.
 */
public static partial class AuthEndpoints
{
    internal static bool TryNormalizeEuPhoneNumber(string? rawValue, out string e164Number)
        => ContactNormalization.TryNormalizeEuPhoneNumber(rawValue, out e164Number);

    private static IReadOnlyCollection<string> BuildPhoneLookupCandidates(string e164Number)
        => ContactNormalization.BuildPhoneLookupCandidates(e164Number);
}
