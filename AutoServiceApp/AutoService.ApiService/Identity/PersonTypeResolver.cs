/**
 * PersonTypeResolver.cs
 *
 * Auto-generated documentation header for this source file.
 */

using AutoService.ApiService.Domain;

namespace AutoService.ApiService.Identity;

/**
 * Backend type for API logic in this file.
 */
internal static class PersonTypeResolver
{
    internal static string Resolve(People person) => person switch
    {
        Mechanic => "mechanic",
        Customer => "customer",
        _ => throw new InvalidOperationException("Unsupported person type.")
    };
}