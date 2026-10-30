using AutoService.ApiService.Auth.Session;
using Microsoft.AspNetCore.Http;

namespace AutoService.UnitTests.Auth;

/** The CSRF cookie is script-readable, otherwise shaped like the refresh cookie, and rotates on every issue. */
public sealed class CsrfTokenCookieTests
{
    private static string IssueHeader(TimeSpan? ttl = null)
    {
        var context = new DefaultHttpContext();
        CsrfTokenCookie.Issue(context.Response, ttl ?? TimeSpan.FromDays(7));
        return context.Response.Headers.SetCookie.ToString();
    }

    private static string TokenOf(string header)
    {
        var pair = header.Split(';')[0];
        Assert.StartsWith($"{AuthCookieNames.CsrfToken}=", pair);
        return pair[(AuthCookieNames.CsrfToken.Length + 1)..];
    }

    [Fact]
    public void Issue_writes_a_43_character_url_safe_token_of_32_random_bytes()
    {
        var token = TokenOf(IssueHeader());

        Assert.Matches("^[A-Za-z0-9_-]{43}$", token);
    }

    [Fact]
    public void Issue_rotates_the_token_on_every_call()
    {
        Assert.NotEqual(TokenOf(IssueHeader()), TokenOf(IssueHeader()));
    }

    [Fact]
    public void Issue_sets_the_host_prefix_flags_and_leaves_the_cookie_readable_by_script()
    {
        var header = IssueHeader(TimeSpan.FromMinutes(5)).ToLowerInvariant();

        Assert.Contains("path=/", header);
        Assert.Contains("secure", header);
        Assert.Contains("samesite=strict", header);
        Assert.Contains("max-age=300", header);
        Assert.DoesNotContain("httponly", header);
        Assert.DoesNotContain("domain=", header);
    }

    [Fact]
    public void Clear_expires_the_cookie_with_the_flags_the_host_prefix_needs()
    {
        var context = new DefaultHttpContext();

        CsrfTokenCookie.Clear(context.Response);

        var header = context.Response.Headers.SetCookie.ToString();
        var lower = header.ToLowerInvariant();
        Assert.StartsWith($"{AuthCookieNames.CsrfToken}=;", header);
        Assert.Contains("expires=thu, 01 jan 1970", lower);
        Assert.Contains("path=/", lower);
        Assert.Contains("secure", lower);
        Assert.Contains("samesite=strict", lower);
    }
}
