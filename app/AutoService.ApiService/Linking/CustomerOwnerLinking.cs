namespace AutoService.ApiService.Linking;

internal static class CustomerOwnerLinking
{
    private const string MechanicOwnedCustomerDomain = "customers.arsm.local";

    internal static string BuildMechanicOwnedCustomerEmail(int mechanicId)
        => $"mechanic-owner-{mechanicId}@{MechanicOwnedCustomerDomain}";
}
