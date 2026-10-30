using System.Net;
using System.Security.Claims;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Middleware;
using AutoService.UnitTests.Security;
using Microsoft.Extensions.Logging;
using static AutoService.UnitTests.Middleware.MiddlewareTestSupport;

namespace AutoService.UnitTests.Middleware;

/** Only a final 401 or 403 is audited, as one warning that names the caller by id and the address by hash. */
public sealed class AuditAccessDeniedMiddlewareTests
{
    private static async Task<RecordingLoggerFactory> RunAsync(
        int finalStatus, ClaimsPrincipal? user = null, IPAddress? ip = null, string method = "GET", string path = "/api/customers")
    {
        var factory = new RecordingLoggerFactory();
        var context = Create(method, path, remoteIp: ip, user: user);
        var middleware = new AuditAccessDeniedMiddleware(http =>
        {
            http.Response.StatusCode = finalStatus;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context, factory);

        return factory;
    }

    private static ClaimsPrincipal Mechanic(string id) =>
        new(new ClaimsIdentity([new Claim(PersonIdClaim.Type, id)], "test"));

    [Theory]
    [InlineData(401)]
    [InlineData(403)]
    public async Task A_denied_response_logs_one_warning_under_the_access_denied_category(int status)
    {
        var factory = await RunAsync(status, Mechanic("7"), method: "DELETE", path: "/api/customers/3");

        var entry = Assert.Single(factory.For("Auth.AccessDenied").Entries);
        Assert.Equal(LogLevel.Warning, entry.Level);
        Assert.Equal(
            $"Access denied ({status}). MechanicId: 7, Method: DELETE, Path: /api/customers/3, IP: unknown.",
            entry.Message);
    }

    [Theory]
    [InlineData(200)]
    [InlineData(204)]
    [InlineData(404)]
    [InlineData(422)]
    [InlineData(429)]
    [InlineData(500)]
    public async Task Any_other_status_logs_nothing(int status)
    {
        var factory = await RunAsync(status);

        Assert.Empty(factory.AllEntries);
    }

    [Fact]
    public async Task An_anonymous_caller_is_logged_without_an_id()
    {
        var factory = await RunAsync(401);

        Assert.Contains("MechanicId: (null),", Assert.Single(factory.AllEntries).Message);
    }

    [Fact]
    public async Task The_address_is_logged_as_a_hash_never_raw()
    {
        var factory = await RunAsync(403, ip: IPAddress.Parse("203.0.113.9"));

        var message = Assert.Single(factory.AllEntries).Message;
        Assert.Contains("IP: sha256:", message);
        Assert.DoesNotContain("203.0.113.9", message);
    }

    [Fact]
    public async Task An_exception_from_the_pipeline_propagates_without_a_log_entry()
    {
        var factory = new RecordingLoggerFactory();
        var middleware = new AuditAccessDeniedMiddleware(_ => throw new InvalidOperationException("boom"));

        await Assert.ThrowsAsync<InvalidOperationException>(() => middleware.InvokeAsync(Create("GET", "/api/x"), factory));

        Assert.Empty(factory.AllEntries);
    }
}
