namespace AutoService.ApiService.Customers;

public static partial class CustomerEndpoints
{
    internal sealed record CustomerDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        int VehicleCount,
        IReadOnlyList<string> VehicleLicensePlates);

    internal sealed record CreateCustomerRequest(
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber);

    internal sealed record UpdateCustomerRequest(
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber);
}
