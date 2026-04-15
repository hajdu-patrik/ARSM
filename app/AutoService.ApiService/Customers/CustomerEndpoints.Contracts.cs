/**
 * CustomerEndpoints.Contracts.cs
 *
 * Auto-generated documentation header for this source file.
 */

namespace AutoService.ApiService.Customers;

/**
 * Backend type for API logic in this file.
 */
public static partial class CustomerEndpoints
{
    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record CustomerDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        int VehicleCount);

    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record CreateCustomerRequest(
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber);

    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record UpdateCustomerRequest(
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber);
}
