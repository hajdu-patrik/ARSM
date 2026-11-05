using System.Linq.Expressions;
using AutoService.ApiService.Domain;

namespace AutoService.ApiService.Customers;

public static partial class CustomerEndpoints
{
    /** Matches names, 'first [middle] last' and 'last first [middle]' (the order the WebUI shows) and plates with ToUpper().Contains. */
    private static Expression<Func<Customer, bool>> CustomerSearchPredicate(string term) => c =>
        c.Name.FirstName.ToUpper().Contains(term) ||
        (c.Name.MiddleName != null && c.Name.MiddleName.ToUpper().Contains(term)) ||
        c.Name.LastName.ToUpper().Contains(term) ||
        (c.Name.FirstName + " " + c.Name.LastName).ToUpper().Contains(term) ||
        (c.Name.MiddleName != null &&
         (c.Name.FirstName + " " + c.Name.MiddleName + " " + c.Name.LastName).ToUpper().Contains(term)) ||
        (c.Name.LastName + " " + c.Name.FirstName).ToUpper().Contains(term) ||
        (c.Name.MiddleName != null &&
         (c.Name.LastName + " " + c.Name.FirstName + " " + c.Name.MiddleName).ToUpper().Contains(term)) ||
        c.Vehicles.Any(v => v.LicensePlate.ToUpper().Contains(term));
}
