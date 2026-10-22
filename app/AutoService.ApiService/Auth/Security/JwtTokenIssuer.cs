using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace AutoService.ApiService.Auth.Security;

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
    private readonly ISessionRevocationService sessionRevocation;
    private readonly SigningCredentials signingCredentials;
    private readonly JwtSecurityTokenHandler tokenHandler = new();

    public JwtTokenIssuer(string secret, string issuer, string audience, ISessionRevocationService sessionRevocation)
    {
        this.issuer = issuer;
        this.audience = audience;
        this.sessionRevocation = sessionRevocation;
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
        // Dated at the person's cutoff when that is ahead (at most a few seconds, inside the clock skew),
        // so the token a handler issues right after revoking is never caught by its own revocation.
        var issuedAtUtc = sessionRevocation.IssueTimeUtc(person.Id, DateTime.UtcNow);
        var email = identityUser.Email ?? person.Email;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, identityUser.Id),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            // The session cutoff compares this issue time; the handler does not add iat on its own.
            new(JwtRegisteredClaimNames.Iat, EpochTime.GetIntDate(issuedAtUtc).ToString(), ClaimValueTypes.Integer64),
            new(ClaimTypes.NameIdentifier, identityUser.Id),
            new(JwtRegisteredClaimNames.Email, email),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Name, person.Name.ToString()),
            new(PersonIdClaim.Type, person.Id.ToString()),
            new("person_type", PersonTypeResolver.Resolve(person))
        };

        if (person is Mechanic { MustChangePassword: true })
        {
            claims.Add(new Claim(PasswordChangeRequiredClaim.Type, PasswordChangeRequiredClaim.Value));
        }

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: issuedAtUtc,
            expires: expiresAtUtc,
            signingCredentials: signingCredentials);

        return tokenHandler.WriteToken(token);
    }
}
