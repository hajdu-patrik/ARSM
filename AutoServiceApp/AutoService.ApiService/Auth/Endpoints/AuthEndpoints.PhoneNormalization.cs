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
    internal static bool TryNormalizeHungarianPhoneNumber(string? rawValue, out string normalizedPhoneNumber)
        => ContactNormalization.TryNormalizeHungarianPhoneNumber(rawValue, out normalizedPhoneNumber);

    private static IReadOnlyCollection<string> BuildHungarianPhoneLookupCandidates(string normalizedPhoneNumber)
        => ContactNormalization.BuildHungarianPhoneLookupCandidates(normalizedPhoneNumber);
}
