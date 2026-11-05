using System.Reflection;
using AutoService.ApiService.Quotes;
using AutoService.UnitTests.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace AutoService.UnitTests.Quotes;

/** DELETE without ?version binds to null and reaches the handler's 422 instead of a model-binding 400 (L6). */
public sealed class QuoteDeleteVersionBindingTests
{
    /** Binds a request like routing does and reports whether the handler ran far enough to touch the database. */
    private static async Task<bool> HandlerRunsAsync(string handler, string[] routeNames, params (string Name, string Value)[] routeValues)
    {
        await using var db = TestDbContextFactory.Create(new DatabaseReachedInterceptor());
        await using var services = new ServiceCollection().AddLogging().AddSingleton(db).BuildServiceProvider();
        var method = typeof(QuoteEndpoints).GetMethod(handler, BindingFlags.NonPublic | BindingFlags.Static)!;
        var factory = RequestDelegateFactory.Create(
            method, null, new RequestDelegateFactoryOptions { ServiceProvider = services, RouteParameterNames = routeNames });

        var context = new DefaultHttpContext { RequestServices = services };
        context.Request.Method = HttpMethods.Delete;
        context.Response.Body = new MemoryStream();
        foreach (var (name, value) in routeValues)
        {
            context.Request.RouteValues[name] = value;
        }

        return await DatabaseReachedInterceptor.ReachesDatabaseAsync(() => factory.RequestDelegate(context));
    }

    [Fact]
    public async Task Deleting_a_quote_without_a_version_reaches_the_handler()
    {
        Assert.True(await HandlerRunsAsync("DeleteQuoteAsync", ["id"], ("id", "1")));
    }

    [Fact]
    public async Task Deleting_a_quote_line_without_a_version_reaches_the_handler()
    {
        Assert.True(await HandlerRunsAsync("DeleteQuoteLineAsync", ["id", "lineId"], ("id", "1"), ("lineId", "2")));
    }
}
