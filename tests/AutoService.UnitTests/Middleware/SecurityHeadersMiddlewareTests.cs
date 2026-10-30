using AutoService.ApiService.Middleware;
using AutoService.UnitTests.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Hosting;

namespace AutoService.UnitTests.Middleware;

/** The fixed security headers: set when missing, never overwritten, CSP skipped for the dev API docs only. */
public sealed class SecurityHeadersMiddlewareTests
{
    private const string Csp = "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

    /** Collects the OnStarting callbacks that DefaultHttpContext would otherwise drop, so a test can fire them. */
    private sealed class FiringResponseFeature : HttpResponseFeature
    {
        private readonly List<(Func<object, Task> Callback, object State)> callbacks = [];

        public override void OnStarting(Func<object, Task> callback, object state) => callbacks.Add((callback, state));

        public async Task FireAsync()
        {
            for (var i = callbacks.Count - 1; i >= 0; i--)
            {
                await callbacks[i].Callback(callbacks[i].State);
            }
        }
    }

    private static async Task<IHeaderDictionary> RunAsync(string path, string environment, Action<IHeaderDictionary>? seed = null)
    {
        var feature = new FiringResponseFeature();
        var context = new DefaultHttpContext();
        context.Features.Set<IHttpResponseFeature>(feature);
        context.Request.Path = path;
        seed?.Invoke(context.Response.Headers);

        var middleware = new SecurityHeadersMiddleware(_ => Task.CompletedTask, new FakeHostEnvironment(environment));
        await middleware.InvokeAsync(context);
        await feature.FireAsync();

        return context.Response.Headers;
    }

    [Fact]
    public async Task Every_response_carries_the_fixed_header_set_with_the_documented_values()
    {
        var headers = await RunAsync("/anything", Environments.Production);

        Assert.Equal("nosniff", headers["X-Content-Type-Options"].ToString());
        Assert.Equal("DENY", headers["X-Frame-Options"].ToString());
        Assert.Equal("strict-origin-when-cross-origin", headers["Referrer-Policy"].ToString());
        Assert.Equal("accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()", headers["Permissions-Policy"].ToString());
        Assert.Equal("same-origin", headers["Cross-Origin-Opener-Policy"].ToString());
        Assert.Equal("same-site", headers["Cross-Origin-Resource-Policy"].ToString());
        Assert.Equal(Csp, headers["Content-Security-Policy"].ToString());
    }

    [Theory]
    [InlineData("/api/customers", true)]
    [InlineData("/API/customers", true)]
    [InlineData("/api", true)]
    [InlineData("/apix", false)]
    [InlineData("/health", false)]
    public async Task Only_api_paths_get_no_store(string path, bool expectNoStore)
    {
        var headers = await RunAsync(path, Environments.Production);

        Assert.Equal(expectNoStore ? "no-store" : string.Empty, headers.CacheControl.ToString());
    }

    [Fact]
    public async Task A_header_a_downstream_component_set_is_kept_untouched()
    {
        var headers = await RunAsync("/api/profile/picture", Environments.Production, seeded =>
        {
            seeded.CacheControl = "private, max-age=3600";
            seeded["X-Frame-Options"] = "SAMEORIGIN";
            seeded["Content-Security-Policy"] = "default-src 'self'";
        });

        Assert.Equal("private, max-age=3600", headers.CacheControl.ToString());
        Assert.Equal("SAMEORIGIN", headers["X-Frame-Options"].ToString());
        Assert.Equal("default-src 'self'", headers["Content-Security-Policy"].ToString());
        Assert.Equal("nosniff", headers["X-Content-Type-Options"].ToString());
    }

    [Theory]
    [InlineData("/openapi/v1.json")]
    [InlineData("/OpenApi/v1.json")]
    [InlineData("/scalar")]
    [InlineData("/scalar/v1")]
    public async Task Development_leaves_the_dev_api_docs_without_a_csp(string path)
    {
        var headers = await RunAsync(path, Environments.Development);

        Assert.False(headers.ContainsKey("Content-Security-Policy"));
        Assert.Equal("nosniff", headers["X-Content-Type-Options"].ToString());
    }

    [Theory]
    [InlineData("/openapi/v1.json", "Production")]
    [InlineData("/scalar", "Staging")]
    [InlineData("/api/customers", "Development")]
    [InlineData("/", "Development")]
    public async Task The_csp_is_set_everywhere_else(string path, string environment)
    {
        var headers = await RunAsync(path, environment);

        Assert.Equal(Csp, headers["Content-Security-Policy"].ToString());
    }

    [Fact]
    public async Task The_next_middleware_still_runs()
    {
        var next = new NextProbe();
        var middleware = new SecurityHeadersMiddleware(next.Delegate, FakeHostEnvironment.Production);

        await middleware.InvokeAsync(new DefaultHttpContext());

        Assert.True(next.Called);
    }
}
