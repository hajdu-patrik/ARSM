using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AutoService.ApiService.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace AutoService.ApiService.Auth;

internal interface IJwtTokenIssuer
{
    string CreateToken(
        IdentityUser identityUser,
        People person,
        IEnumerable<string> roles,
        DateTime expiresAtUtc);
}

internal sealed class JwtTokenIssuer : IJwtTokenIssuer
{
    private readonly string issuer;
    private readonly string audience;
    private readonly SigningCredentials signingCredentials;
    private readonly JwtSecurityTokenHandler tokenHandler = new();

    public JwtTokenIssuer(string secret, string issuer, string audience)
    {
        this.issuer = issuer;
        this.audience = audience;
        signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            SecurityAlgorithms.HmacSha256);
    }

    public string CreateToken(
        IdentityUser identityUser,
        People person,
        IEnumerable<string> roles,
        DateTime expiresAtUtc)
    {
        var nowUtc = DateTime.UtcNow;
        var email = identityUser.Email ?? person.Email;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, identityUser.Id),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(ClaimTypes.NameIdentifier, identityUser.Id),
            new(JwtRegisteredClaimNames.Email, email),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Name, person.Name.ToString()),
            new("person_id", person.Id.ToString()),
            new("person_type", ResolvePersonType(person))
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: nowUtc,
            expires: expiresAtUtc,
            signingCredentials: signingCredentials);

        return tokenHandler.WriteToken(token);
    }

    private static string ResolvePersonType(People person) => person switch
    {
        Mechanic => "mechanic",
        Customer => "customer",
        _ => throw new InvalidOperationException("Unsupported person type.")
    };
}