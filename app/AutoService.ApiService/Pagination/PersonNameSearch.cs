using System.Linq.Expressions;
using AutoService.ApiService.Domain;

namespace AutoService.ApiService.Pagination;

/** Shared name search of the people lists; the `.ToUpper().Contains` shape matches the pg_trgm indexes. */
internal static class PersonNameSearch
{
    /** Matches first, middle, last, 'first last', 'first middle last', 'last first' and 'last first middle'. */
    internal static Expression<Func<T, bool>> Matches<T>(string term) where T : People => p =>
        p.Name.FirstName.ToUpper().Contains(term) ||
        (p.Name.MiddleName != null && p.Name.MiddleName.ToUpper().Contains(term)) ||
        p.Name.LastName.ToUpper().Contains(term) ||
        (p.Name.FirstName + " " + p.Name.LastName).ToUpper().Contains(term) ||
        (p.Name.MiddleName != null &&
         (p.Name.FirstName + " " + p.Name.MiddleName + " " + p.Name.LastName).ToUpper().Contains(term)) ||
        (p.Name.LastName + " " + p.Name.FirstName).ToUpper().Contains(term) ||
        (p.Name.MiddleName != null &&
         (p.Name.LastName + " " + p.Name.FirstName + " " + p.Name.MiddleName).ToUpper().Contains(term));

    /** Combines two predicates with OR into one expression over the first predicate's parameter. */
    internal static Expression<Func<T, bool>> Or<T>(Expression<Func<T, bool>> left, Expression<Func<T, bool>> right)
    {
        var rebound = new ParameterRebinder(right.Parameters[0], left.Parameters[0]).Visit(right.Body);
        return Expression.Lambda<Func<T, bool>>(Expression.OrElse(left.Body, rebound), left.Parameters);
    }

    private sealed class ParameterRebinder(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) => node == from ? to : node;
    }
}
