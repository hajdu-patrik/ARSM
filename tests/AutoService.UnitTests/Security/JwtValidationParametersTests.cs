using System.Text;
using AutoService.ApiService.Auth.Security;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace AutoService.UnitTests.Security;

/** Only HS256 passes the access-token validation; HS384 and HS512 with the same key are refused. */
public sealed class JwtValidationParametersTests
{
    private const string Secret = "unit-test-secret-of-exactly-sixty-four-bytes-for-the-hs512-minimum!!";
    private const string Issuer = "unit-test-issuer";
    private const string Audience = "unit-test-audience";

    private static string CreateToken(string algorithm)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret));
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = Issuer,
            Audience = Audience,
            Expires = DateTime.UtcNow.AddMinutes(5),
            SigningCredentials = new SigningCredentials(key, algorithm)
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }

    private static Task<TokenValidationResult> ValidateAsync(string token, bool restrictAlgorithms = true)
    {
        var parameters = JwtValidationParameters.Create(Secret, Issuer, Audience);
        if (!restrictAlgorithms)
        {
            parameters.ValidAlgorithms = null;
        }

        return new JsonWebTokenHandler().ValidateTokenAsync(token, parameters);
    }

    [Fact]
    public async Task An_HS256_token_validates()
    {
        var result = await ValidateAsync(CreateToken(SecurityAlgorithms.HmacSha256));

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(SecurityAlgorithms.HmacSha384)]
    [InlineData(SecurityAlgorithms.HmacSha512)]
    public async Task A_token_signed_with_another_HMAC_algorithm_is_rejected(string algorithm)
    {
        var token = CreateToken(algorithm);

        var unrestricted = await ValidateAsync(token, restrictAlgorithms: false);
        var restricted = await ValidateAsync(token);

        // The control run proves the algorithm list, not the key or the claims, is what rejects the token.
        Assert.True(unrestricted.IsValid);
        Assert.False(restricted.IsValid);
        Assert.IsAssignableFrom<SecurityTokenException>(restricted.Exception);
    }
}
