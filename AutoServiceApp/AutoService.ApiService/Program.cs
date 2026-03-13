using AutoService.ApiService.Auth;
using AutoService.ApiService.Data;
using AutoService.ApiService.DataInitialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Collections.Concurrent;
using System.Globalization;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Optional local overrides for running EF CLI/API outside AppHost.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Service registration section (DI container).
builder.Services.AddOpenApi();
builder.Services.AddDbContext<AutoServiceDbContext>(options =>
{
    var connectionString = ConnectionStringResolver.Resolve(builder.Configuration);

    options.UseNpgsql(connectionString);
});

// Identity and authentication configuration.
var jwtSecret = JwtSettingsResolver.ResolveSecret(builder.Configuration);
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "AutoService.ApiService";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "AutoService.WebUI";
var loginRateLimitWindow = TimeSpan.FromMinutes(1);
var loginBanWindow = TimeSpan.FromMinutes(3);
var loginBanByClient = new ConcurrentDictionary<string, DateTimeOffset>();

static string ResolveLoginClientKey(HttpContext context)
{
    var ip = context.Connection.RemoteIpAddress?.ToString();
    return string.IsNullOrWhiteSpace(ip) ? "unknown" : ip;
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
    .AddEntityFrameworkStores<AutoServiceDbContext>()
    .AddSignInManager();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
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
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        if (!context.HttpContext.Request.Path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var key = ResolveLoginClientKey(context.HttpContext);
        var blockedUntil = DateTimeOffset.UtcNow.Add(loginBanWindow);

        loginBanByClient.AddOrUpdate(
            key,
            blockedUntil,
            (_, existing) => existing > blockedUntil ? existing : blockedUntil);

        context.HttpContext.Response.Headers.RetryAfter =
            ((int)Math.Ceiling(loginBanWindow.TotalSeconds)).ToString(CultureInfo.InvariantCulture);

        await context.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Too many login attempts. Try again in 3 minutes." },
            cancellationToken);
    };

    options.AddFixedWindowLimiter("AuthLoginAttempts", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10;
        limiterOptions.Window = loginRateLimitWindow;
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0;
    });
});

builder.Services.AddAuthorization();

// Application services.
var app = builder.Build();

// Ensure the database is created and seeded with demo data at startup.
await app.EnsureSeededAsync();

// -------------------------
// Middleware pipeline starts
// -------------------------
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

// Middleware: redirects HTTP requests to HTTPS.
app.UseHttpsRedirection();

// Middleware: login ban check (5-minute cooldown after auth rate limit hit).
app.Use(async (context, next) =>
{
    if (context.Request.Path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase))
    {
        var key = ResolveLoginClientKey(context);
        var now = DateTimeOffset.UtcNow;

        if (loginBanByClient.TryGetValue(key, out var blockedUntil))
        {
            if (blockedUntil > now)
            {
                var retryAfterSeconds = (int)Math.Ceiling((blockedUntil - now).TotalSeconds);
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers.RetryAfter = retryAfterSeconds.ToString(CultureInfo.InvariantCulture);
                await context.Response.WriteAsJsonAsync(new { error = "Too many login attempts. Try again in 3 minutes." });
                return;
            }

            loginBanByClient.TryRemove(key, out _);
        }
    }

    await next();
});

// Middleware: authentication and authorization.
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Endpoint mapping: maps controller routes, then auth endpoints.
app.MapAuthEndpoints();

// Endpoint mapping section.
app.Run();


/**
 * Resolves the database connection string, preferring the environment variable
 * 'ConnectionStrings__AutoServiceDb' over appsettings to support Aspire injection
 * and Docker / CI environment overrides without touching committed config files.
 */
static class ConnectionStringResolver
{
    /**
     * Resolves database connection string from environment first, then configuration.
     *
     * @param configuration ASP.NET Core configuration root.
     * @return A non-empty PostgreSQL connection string.
     */
    public static string Resolve(IConfiguration configuration)
    {
        var fromEnvironment = Environment.GetEnvironmentVariable("ConnectionStrings__AutoServiceDb");
        var fromConfiguration = configuration.GetConnectionString("AutoServiceDb");

        var connectionString = string.IsNullOrWhiteSpace(fromEnvironment)
            ? fromConfiguration
            : fromEnvironment;

        if (string.IsNullOrWhiteSpace(connectionString) || connectionString.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Connection string 'AutoServiceDb' is missing. Run through AppHost (Aspire injects it). If you want to run the API project separately, provide a valid connection string in appsettings.Local.json or set the environment variable 'ConnectionStrings__AutoServiceDb'.");
        }

        return connectionString;
    }
}


/**
 * Resolves the JWT signing secret, preferring the environment variable
 * 'JwtSettings__Secret' over appsettings. Throws at startup if the secret is
 * missing, set to a placeholder, or shorter than 32 bytes (HMAC-SHA256 minimum).
 */
static class JwtSettingsResolver
{
    /**
     * Resolves JWT secret from environment first, then configuration.
     *
     * @param configuration ASP.NET Core configuration root.
     * @return A non-empty JWT signing secret.
     */
    public static string ResolveSecret(IConfiguration configuration)
    {
        var fromEnvironment = Environment.GetEnvironmentVariable("JwtSettings__Secret");
        var fromConfiguration = configuration["JwtSettings:Secret"];

        var secret = string.IsNullOrWhiteSpace(fromEnvironment)
            ? fromConfiguration
            : fromEnvironment;

        if (string.IsNullOrWhiteSpace(secret) || secret.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "JWT secret 'JwtSettings:Secret' is missing. Provide a strong secret in appsettings.Local.json, user secrets, or the 'JwtSettings__Secret' environment variable.");
        }

        if (Encoding.UTF8.GetByteCount(secret) < 32)
        {
            throw new InvalidOperationException(
                "JWT secret 'JwtSettings:Secret' must be at least 32 bytes long.");
        }

        return secret;
    }
}