/**
 * CustomerOwnerLinking.cs
 *
 * Auto-generated documentation header for this source file.
 */

namespace AutoService.ApiService.Linking;

/**
 * Backend type for API logic in this file.
 */
internal static class CustomerOwnerLinking
{
    private const string MechanicOwnedCustomerDomain = "customers.arsm.local";

    internal static string BuildMechanicOwnedCustomerEmail(int mechanicId)
        => $"mechanic-owner-{mechanicId}@{MechanicOwnedCustomerDomain}";
}
