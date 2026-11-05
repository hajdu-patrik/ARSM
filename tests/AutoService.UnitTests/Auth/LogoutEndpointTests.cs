using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Auth.Security;
using AutoService.UnitTests.Data;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.Auth;

/** Logout answers from the session facts alone: a valid access token or an active refresh cookie ends it, neither is 401 (K2). */
public sealed class LogoutEndpointTests
{
    private sealed class RecordingDenylist : ITokenDenylistService
    {
        public List<string> Revoked { get; } = [];

        public Task RevokeAsync(string jwtId, DateTimeOffset expiresAtUtc, CancellationToken cancellationToken = default)
        {
            Revoked.Add(jwtId);
            return Task.CompletedTask;
        }

        public Task<bool> IsRevokedAsync(string jwtId, CancellationToken cancellationToken = default) => Task.FromResult(false);
    }

    private static ClaimsPrincipal SignedIn(string jwtId, DateTimeOffset expiresAt) => new(new ClaimsIdentity(
        [
            new Claim(JwtRegisteredClaimNames.Jti, jwtId),
            new Claim(JwtRegisteredClaimNames.Exp, expiresAt.ToUnixTimeSeconds().ToString()),
        ],
        "test"));

    private static async Task<IResult> LogoutAsync(HttpContext context, RecordingDenylist denylist)
    {
        await using var db = TestDbContextFactory.Create(new DatabaseReachedInterceptor());
        return await PrivateStatic.Call<Task<IResult>>(
            typeof(AuthEndpoints), "LogoutAsync", context, db, denylist, NullLoggerFactory.Instance, CancellationToken.None);
    }

    [Fact]
    public async Task Neither_an_access_token_nor_a_refresh_cookie_is_401_and_denylists_nothing()
    {
        var denylist = new RecordingDenylist();

        var result = await LogoutAsync(new DefaultHttpContext(), denylist);

        Assert.IsType<UnauthorizedHttpResult>(result);
        Assert.Empty(denylist.Revoked);
    }

    [Fact]
    public async Task A_valid_access_token_alone_ends_the_session_with_204_and_denylists_its_jti()
    {
        var denylist = new RecordingDenylist();
        var context = new DefaultHttpContext { User = SignedIn("jti-1", DateTimeOffset.UtcNow.AddMinutes(5)) };

        var result = await LogoutAsync(context, denylist);

        Assert.IsType<NoContent>(result);
        Assert.Equal(["jti-1"], denylist.Revoked);
        Assert.True(context.Response.Headers.SetCookie.Count > 0);
    }
}
