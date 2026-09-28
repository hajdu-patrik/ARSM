using AutoService.ApiService.Domain.UniqueTypes;
using System.Diagnostics.CodeAnalysis;

namespace AutoService.ApiService.Domain;

/** Customer entity derived from People. */
public class Customer : People
{
    /** Parameterless constructor required by EF Core. */
    public Customer() {}

    /** Creates a customer with required person fields. */
    [SetsRequiredMembers]
    public Customer(FullName name, string email, string? phoneNumber)
     : base(name, email, phoneNumber) {}

    // Vehicles owned by this customer.
    public ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
}