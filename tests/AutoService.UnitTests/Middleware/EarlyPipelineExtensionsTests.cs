using System.Net;
using AutoService.ApiService.Middleware;
using AutoService.UnitTests.Configuration;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using static AutoService.UnitTests.Middleware.MiddlewareTestSupport;

namespace AutoService.UnitTests.Middleware;

/** The production early pipeline runs CORS before the login ban, so the ban's 429 carries CORS headers. */
public sealed class EarlyPipelineExtensionsTests
{
    private const string AllowedOrigin = "https://app.example.test";
    private const string CorsHeader = "Access-Control-Allow-Origin";

    private static int addressCounter;

    private static IPAddress UniqueIp()
    {
        var n = Interlocked.Increment(ref addressCounter);
        return new IPAddress(new byte[] { 10, 99, (byte)(n >> 8), (byte)n });
    }

    /** Keeps the OnStarting callbacks (CORS applies its headers there) that DefaultHttpContext would drop. */
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

    private static RequestDelegate BuildPipeline()
    {
        var services = new ServiceCollection()
            .AddLogging()
            .AddSingleton<IConfiguration>(new ConfigurationBuilder().Build())
            .AddSingleton<IWebHostEnvironment>(FakeHostEnvironment.Development)
            .AddResponseCompression()
            .Configure<ForwardedHeadersOptions>(o => o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto)
            .AddCors(options => options.AddPolicy(
                EarlyPipelineExtensions.WebUiCorsPolicyName,
                policy => policy.WithOrigins(AllowedOrigin).AllowCredentials().WithMethods("POST")))
            .BuildServiceProvider();
        // A server feature collection, because UseHttpsRedirection asks the builder for its server addresses.
        var app = new ApplicationBuilder(services, new FeatureCollection());
        app.UseArsmEarlyPipeline(isDevelopment: true);
        app.Run(_ => Task.CompletedTask);
        return app.Build();
    }

    private static async Task<DefaultHttpContext> SendBannedLoginAsync(string path, string origin)
    {
        var ip = UniqueIp();
        LoginBanMiddleware.BanClient(Create("POST", "/api/auth/login", remoteIp: ip));
        var feature = new FiringResponseFeature();
        var context = Create("POST", path, origin: origin, remoteIp: ip);
        context.Features.Set<IHttpResponseFeature>(feature);
        context.Request.Scheme = "https";
        context.Request.Host = new HostString("api.example.test");

        await BuildPipeline()(context);
        await feature.FireAsync();

        return context;
    }

    [Theory]
    [InlineData("/api/auth/login")]
    [InlineData("/api/auth/login/")]
    public async Task A_banned_login_from_an_allowed_origin_answers_429_with_the_cors_header(string path)
    {
        var context = await SendBannedLoginAsync(path, AllowedOrigin);

        Assert.Equal(StatusCodes.Status429TooManyRequests, context.Response.StatusCode);
        Assert.Equal("login_banned", ReadJson(context).GetProperty("code").GetString());
        Assert.Equal(AllowedOrigin, context.Response.Headers[CorsHeader].ToString());
    }

    [Fact]
    public async Task A_banned_login_from_another_origin_answers_429_without_a_cors_header()
    {
        var context = await SendBannedLoginAsync("/api/auth/login", "https://evil.example.test");

        Assert.Equal(StatusCodes.Status429TooManyRequests, context.Response.StatusCode);
        Assert.False(context.Response.Headers.ContainsKey(CorsHeader));
    }
}
