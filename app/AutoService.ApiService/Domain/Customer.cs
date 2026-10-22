using AutoService.ApiService.Domain.UniqueTypes;
using System.Diagnostics.CodeAnalysis;

namespace AutoService.ApiService.Domain;

public class Customer : People
{
    /** Parameterless constructor required by EF Core. */
    public Customer() {}

    [SetsRequiredMembers]
    public Customer(FullName name, string email, string? phoneNumber)
     : base(name, email, phoneNumber) {}

    public ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
}