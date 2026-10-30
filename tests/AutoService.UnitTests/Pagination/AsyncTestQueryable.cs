using System.Collections;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore.Query;

namespace AutoService.UnitTests.Pagination;

/** An in-memory IQueryable that answers EF Core's async operators (CountAsync, ToListAsync) without a database. */
internal sealed class AsyncTestQueryable<T> : IOrderedQueryable<T>, IAsyncEnumerable<T>, IAsyncQueryProvider
{
    private readonly IQueryable<T> inner;

    internal AsyncTestQueryable(IEnumerable<T> items) : this(items.AsQueryable())
    {
    }

    private AsyncTestQueryable(IQueryable<T> inner)
    {
        this.inner = inner;
    }

    public Type ElementType => typeof(T);

    public Expression Expression => inner.Expression;

    public IQueryProvider Provider => this;

    public IEnumerator<T> GetEnumerator() => inner.GetEnumerator();

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

    public IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken cancellationToken = default)
        => new AsyncEnumerator(inner.GetEnumerator());

    public IQueryable CreateQuery(Expression expression) => inner.Provider.CreateQuery(expression);

    public IQueryable<TElement> CreateQuery<TElement>(Expression expression)
        => new AsyncTestQueryable<TElement>(inner.Provider.CreateQuery<TElement>(expression));

    public object? Execute(Expression expression) => inner.Provider.Execute(expression);

    public TResult Execute<TResult>(Expression expression) => inner.Provider.Execute<TResult>(expression);

    public TResult ExecuteAsync<TResult>(Expression expression, CancellationToken cancellationToken = default)
    {
        var resultType = typeof(TResult).GetGenericArguments()[0];
        var result = typeof(IQueryProvider)
            .GetMethod(nameof(IQueryProvider.Execute), 1, [typeof(Expression)])!
            .MakeGenericMethod(resultType)
            .Invoke(inner.Provider, [expression]);

        return (TResult)typeof(Task)
            .GetMethod(nameof(Task.FromResult))!
            .MakeGenericMethod(resultType)
            .Invoke(null, [result])!;
    }

    private sealed class AsyncEnumerator(IEnumerator<T> source) : IAsyncEnumerator<T>
    {
        public T Current => source.Current;

        public ValueTask<bool> MoveNextAsync() => new(source.MoveNext());

        public ValueTask DisposeAsync()
        {
            source.Dispose();
            return default;
        }
    }
}
