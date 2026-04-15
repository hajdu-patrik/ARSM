/**
 * Customer.cs
 *
 * Auto-generated documentation header for this source file.
 */

using AutoService.ApiService.Domain.UniqueTypes;
using System.Diagnostics.CodeAnalysis;

namespace AutoService.ApiService.Domain;

/**
 * Customer entity derived from People.
 */
public class Customer : People
{
    /**
     * Parameterless constructor required by EF Core.
     */
    public Customer() {}
    
    /**
     * Creates a customer with required person fields.
     *
     * @param name Full name value object.
     * @param email Customer email address.
     * @param phoneNumber Optional phone number.
     */
    [SetsRequiredMembers]
    public Customer(FullName name, string email, string? phoneNumber)
     : base(name, email, phoneNumber) {}

    // Vehicles owned by this customer.
    public ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
}