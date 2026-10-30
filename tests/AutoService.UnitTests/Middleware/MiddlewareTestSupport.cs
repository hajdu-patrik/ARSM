using System.Net;
using System.Security.Claims;
using System.Text.Json;
using AutoService.ApiService.Auth.Session;
using Microsoft.AspNetCore.Http;

namespace AutoService.UnitTests.Middleware;

/** Records whether the next delegate of a middleware ran. */
internal sealed class NextProbe
{
    public bool Called { get; private set; }

    public RequestDelegate Delegate => _ =>
    {
        Called = true;
        return Task.CompletedTask;
    };
}

/** Builds request contexts and reads the JSON a middleware wrote, for the middleware tests. */
internal static class MiddlewareTestSupport
{
    public static readonly string AuthCookie = $"{AuthCookieNames.AccessToken}=jwt";

    public static DefaultHttpContext Create(
        string method,
        string path,
        string? cookies = null,
        string? origin = null,
        IPAddress? remoteIp = null,
        ClaimsPrincipal? user = null)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = method;
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();
        context.Connection.RemoteIpAddress = remoteIp;

        if (cookies is not null)
        {
            context.Request.Headers.Cookie = cookies;
        }

        if (origin is not null)
        {
            context.Request.Headers.Origin = origin;
        }

        if (user is not null)
        {
            context.User = user;
        }

        return context;
    }

    public static JsonElement ReadJson(HttpContext context)
    {
        context.Response.Body.Position = 0;
        using var document = JsonDocument.Parse(context.Response.Body);
        return document.RootElement.Clone();
    }
}
