using System.Linq.Expressions;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Pagination;

namespace AutoService.ApiService.Customers;

public static partial class CustomerEndpoints
{
    /** Matches person names (single and full-name orders) and license plates with ToUpper().Contains. */
    private static Expression<Func<Customer, bool>> CustomerSearchPredicate(string term)
        => PersonNameSearch.Or(
            PersonNameSearch.Matches<Customer>(term),
            c => c.Vehicles.Any(v => v.LicensePlate.ToUpper().Contains(term)));
}
