using AutoService.ApiService.Domain;

namespace AutoService.ApiService.Identity;

internal static class PersonTypeResolver
{
    internal static string Resolve(People person) => person switch
    {
        Mechanic => "mechanic",
        Customer => "customer",
        _ => throw new InvalidOperationException("Unsupported person type.")
    };
}