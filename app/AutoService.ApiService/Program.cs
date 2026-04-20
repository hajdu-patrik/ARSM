/**
 * Program.cs
 *
 * Auto-generated documentation header for this source file.
 */

using AutoService.ApiService.Admin;
using AutoService.ApiService.Appointments;
using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Configuration;
using AutoService.ApiService.Customers;
using AutoService.ApiService.Data;
using AutoService.ApiService.DataInitialization;
using AutoService.ApiService.Middleware;
using AutoService.ApiService.Profile.Endpoints;
using AutoService.ApiService.Profile.Realtime;
using AutoService.ApiService.Vehicles;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Net;
using System.Globalization;
using System.Text;
using System.Threading.RateLimiting;
using Scalar.AspNetCore;

/**
 * API service entrypoint.
 *
 * This top-level program configures the full backend runtime:
 * - configuration resolution (database/JWT/CORS/forwarded headers)
 * - service registrations (EF Core, Identity, auth, rate limits, CORS, SSE broadcaster)
 * - middleware pipeline ordering
 * - endpoint mapping for all API areas
 *
 * Operational notes:
 * - appsettings.Local.json is optional and intended for local overrides only.
 * - startup fails fast when critical security configuration is missing or invalid.
 * - demo data seeding/migrations are executed during startup via EnsureSeededAsync().
 */
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Optional local overrides for running EF CLI/API outside AppHost.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Service registration section.
builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();
var connectionString = ConnectionStringResolver.Resolve(builder.Configuration);
builder.Services.AddDbContext<AutoServiceDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

/**
 * Forwarded headers trust policy configuration.
 *
 * @param options Mutable forwarded headers options instance.
 * @return Configuration side effects are applied directly to options.
 */
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = builder.Configuration.GetValue<int?>("ForwardedHeaders:ForwardLimit") ?? 1;

    options.KnownProxies.Clear();
    options.KnownIPNetworks.Clear();

    var knownProxies = builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [];
    foreach (var proxy in knownProxies)
    {
        if (IPAddress.TryParse(proxy, out var proxyIpAddress))
        {
            options.KnownProxies.Add(proxyIpAddress);
        }
    }

    var knownNetworks = builder.Configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>() ?? [];
    foreach (var network in knownNetworks)
    {
        var parts = network.Split('/', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 2 &&
            IPAddress.TryParse(parts[0], out var prefix) &&
            int.TryParse(parts[1], out var prefixLength))
        {
            options.KnownIPNetworks.Add(new global::System.Net.IPNetwork(prefix, prefixLength));
        }
    }

    if (options.KnownProxies.Count == 0 && options.KnownIPNetworks.Count == 0)
    {
        options.KnownProxies.Add(IPAddress.Loopback);
        options.KnownProxies.Add(IPAddress.IPv6Loopback);
    }
});

// Identity and authentication configuration.
var jwtSecret = JwtSettingsResolver.ResolveSecret(builder.Configuration);
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "AutoService.ApiService";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "AutoService.WebUI";
var webUiOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?.Where(x => !string.IsNullOrWhiteSpace(x))
    .ToArray()
    ?? [];

if (webUiOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "CORS allowed origins are missing. Configure 'Cors:AllowedOrigins' for the WebUI endpoint.");
}

builder.Services
    .AddIdentityCore<IdentityUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;

        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AutoServiceDbContext>()
    .AddSignInManager();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        /**
         * JWT bearer event hooks.
         *
         * OnMessageReceived:
         * - reads access token from HttpOnly cookie when Authorization header is missing.
         *
         * OnTokenValidated:
         * - checks denylist for JTI revocation and fails auth if token is revoked.
         */
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (string.IsNullOrWhiteSpace(context.Token) &&
                    context.Request.Cookies.TryGetValue(AuthCookieNames.AccessToken, out var accessTokenCookie))
                {
                    context.Token = accessTokenCookie;
                }

                return Task.CompletedTask;
            },
            OnTokenValidated = async context =>
            {
                var jwtId = context.Principal?.FindFirst("jti")?.Value;

                if (!string.IsNullOrWhiteSpace(jwtId))
                {
                    var denylist = context.HttpContext.RequestServices.GetRequiredService<ITokenDenylistService>();
                    try
                    {
                        if (await denylist.IsRevokedAsync(jwtId, context.HttpContext.RequestAborted))
                        {
                            context.Fail("Token has been revoked.");
                        }
                    }
                    catch (OperationCanceledException) when (context.HttpContext.RequestAborted.IsCancellationRequested)
                    {
                    }
                }
            },
        };

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddRateLimiter(options =>
{
    /**
     * Rate-limit rejection behavior.
     *
     * For login route only, this callback additionally:
     * - activates temporary login-ban window,
     * - sets Retry-After response header,
     * - returns stable JSON error payload.
     */
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        if (!context.HttpContext.Request.Path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        LoginBanMiddleware.BanClient(context.HttpContext);

        var retryAfterSeconds = LoginBanMiddleware.BanWindowSeconds;
        context.HttpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString(CultureInfo.InvariantCulture);

        await context.HttpContext.Response.WriteAsJsonAsync(
            new
            {
                code = "login_rate_limited",
                error = "Too many login attempts. Try again in 3 minutes!",
                retryAfterSeconds
            },
            cancellationToken);
    };

    options.AddFixedWindowLimiter("AuthLoginAttempts", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0;
    });

    options.AddFixedWindowLimiter("AuthRefreshAttempts", limiterOptions =>
    {
        limiterOptions.PermitLimit = 20;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0;
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("WebUIPolicy", corsPolicyBuilder =>
    {
        corsPolicyBuilder
            .WithOrigins(webUiOrigins)
            .AllowCredentials()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});
builder.Services.AddSingleton<IJwtTokenIssuer>(_ => new JwtTokenIssuer(jwtSecret, jwtIssuer, jwtAudience));
builder.Services.AddSingleton<ITokenDenylistService, TokenDenylistService>();
builder.Services.AddSingleton<IProfilePictureUpdateBroadcaster, ProfilePictureUpdateBroadcaster>();

// Build.
var app = builder.Build();

// Ensure the database is created and seeded with demo data at startup.
await app.EnsureSeededAsync();

// -------------------------
// Middleware pipeline
// -------------------------
/**
 * Middleware ordering is security-sensitive.
 *
 * Effective order:
 * - forwarded headers
 * - https redirection / hsts
 * - security headers
 * - login ban middleware
 * - rate limiter
 * - cors
 * - audit access denied middleware (wraps auth pipeline to log 401/403)
 * - authentication
 * - authorization
 */
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}
else
{
    app.UseHsts();
}

app.UseForwardedHeaders();
app.UseHttpsRedirection();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<LoginBanMiddleware>();
app.UseRateLimiter();
app.UseCors("WebUIPolicy");
app.UseMiddleware<AuditAccessDeniedMiddleware>();
app.UseAuthentication();
app.UseAuthorization();

// Endpoint mapping.
/**
 * Endpoint map groups by domain module.
 *
 * @return The app starts with all endpoint groups and default health endpoints mapped.
 */
app.MapAuthEndpoints();
app.MapAppointmentEndpoints();
app.MapProfileEndpoints();
app.MapAdminEndpoints();
app.MapCustomerEndpoints();
app.MapVehicleEndpoints();
app.MapDefaultEndpoints();

app.Run();