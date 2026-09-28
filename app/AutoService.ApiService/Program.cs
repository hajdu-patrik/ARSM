using AutoService.ApiService.Admin;
using AutoService.ApiService.Appointments;
using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Catalog;
using AutoService.ApiService.Configuration;
using AutoService.ApiService.Customers;
using AutoService.ApiService.Data;
using AutoService.ApiService.DataInitialization;
using AutoService.ApiService.Middleware;
using AutoService.ApiService.Profile.Endpoints;
using AutoService.ApiService.Quotes;
using AutoService.ApiService.Quotes.Pdf;
using AutoService.ApiService.Reporting;
using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Profile.Realtime;
using AutoService.ApiService.Imaging;
using AutoService.ApiService.Maintenance;
using AutoService.ApiService.Security;
using AutoService.ApiService.Storage;
using AutoService.ApiService.Vehicles;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.IO.Compression;
using System.Net;
using System.Globalization;
using System.Text;
using System.Threading.RateLimiting;
using OpenTelemetry.Trace;
using Scalar.AspNetCore;

/** API service entrypoint: resolves config, registers services, orders middleware, and maps
    endpoints; fails fast on invalid security config (appsettings.Local.json is local-only). */
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

/** DB readiness check, added here (not ServiceDefaults) to keep those Npgsql-free; carries no
    "live" tag, so /alive stays process-only while /health also reflects DB connectivity. */
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AutoServiceDbContext>();

/** EF Core/Npgsql command spans in OpenTelemetry traces. Registered here (not in ServiceDefaults) to keep the shared defaults generic and free of a Postgres-specific dependency. */
builder.Services.ConfigureOpenTelemetryTracerProvider(tracing => tracing.AddNpgsql());

// Optional local overrides for running EF CLI/API outside AppHost.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Service registration section.
builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();

// Backs the global exception handler registered below in the middleware pipeline.
builder.Services.AddProblemDetails();

var connectionString = ConnectionStringResolver.Resolve(builder.Configuration);

/** Quote PDF runtime setup, resolved here (not the handler); see Quote Anchors in
    ApiService/CLAUDE.md (QuestPDF license, fonts, fail-fast fields). */
var companyProfile = CompanyProfileResolver.Resolve(builder.Configuration);
builder.Services.AddSingleton(companyProfile);
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
QuestPDF.Settings.UseSystemFonts = false;
QuestPDF.Settings.ThrowOnMissingTextGlyphs = true;
QuoteDocumentAssets.RegisterFonts();
builder.Services.AddDbContext<AutoServiceDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

/** Forwarded headers trust policy configuration. */
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

/** JwtSettings:ExpirationMinutes drives both the access-token cookie lifetime and the JWT exp claim. It is set exactly once here, before any request is served; every call site in the auth and profile endpoints reads the read-only AuthEndpoints.AccessTokenTtl. */
var jwtExpirationMinutes = JwtSettingsResolver.ResolveExpirationMinutes(builder.Configuration);
AuthEndpoints.ConfigureAccessTokenTtl(jwtExpirationMinutes);

var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "AutoService.ApiService";
var jwtAudience = builder.Configuration["JwtSettings:Audience"] ?? "AutoService.WebUI";
var webUiOriginPolicy = WebUiOriginPolicy.Create(builder.Configuration, builder.Environment);
var webUiOrigins = webUiOriginPolicy.AllowedOrigins.ToArray();
builder.Services.AddSingleton(webUiOriginPolicy);

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
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        /** JWT bearer events: reads the access token from the cookie when the Authorization header is
            missing, and fails auth when the token's JTI is denylisted (revocation; see docs/PROJECT-OVERVIEW.md). */
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
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddRateLimiter(options =>
{
    /** Rate-limit rejection: for the login route only, this also bans the client, sets
        Retry-After, and returns a stable JSON error payload. */
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

    /** Partitioned per client (not a global bucket) so one noisy client cannot lock out every other
        user; the Development-only higher limit is for the local test suite (rate limits: ApiService/CLAUDE.md). */
    var authLoginPermitLimit = builder.Environment.IsDevelopment() ? 300 : 10;

    options.AddPolicy("AuthLoginAttempts", context => RateLimitPartition.GetFixedWindowLimiter(
        LoginBanMiddleware.ResolveClientKey(context),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = authLoginPermitLimit,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        }));

    /** AuthRefreshAttempts partitioning rationale: same as AuthLoginAttempts above, partitioned per client so one noisy client cannot exhaust the shared refresh quota for every other signed-in user. */
    options.AddPolicy("AuthRefreshAttempts", context => RateLimitPartition.GetFixedWindowLimiter(
        LoginBanMiddleware.ResolveClientKey(context),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        }));
});

/** Brotli/Gzip response compression (HTTPS included); safe from BREACH because tokens travel only
    as HttpOnly cookies, never in JSON bodies (see docs/PROJECT-OVERVIEW.md). SSE stays uncompressed. */
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options => options.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(options => options.Level = CompressionLevel.Fastest);

builder.Services.AddCors(options =>
{
    options.AddPolicy("WebUIPolicy", corsPolicyBuilder =>
    {
        corsPolicyBuilder
            .WithOrigins(webUiOrigins)
            .AllowCredentials()
            .WithMethods("GET", "POST", "PUT", "DELETE")
            .WithHeaders("Content-Type", AuthCookieNames.CsrfHeaderName);
    });
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("MechanicOnly", policy => policy.RequireClaim("person_type", "mechanic"));
});
builder.Services.AddSingleton<IJwtTokenIssuer>(_ => new JwtTokenIssuer(jwtSecret, jwtIssuer, jwtAudience));
builder.Services.AddSingleton<ITokenDenylistService, TokenDenylistService>();
builder.Services.AddSingleton<IProfilePictureUpdateBroadcaster, ProfilePictureUpdateBroadcaster>();
builder.Services.AddSingleton<IAppointmentUpdateBroadcaster, AppointmentUpdateBroadcaster>();
builder.Services.AddSingleton<IProfilePictureProcessor, ImageSharpProfilePictureProcessor>();
builder.Services.AddProfilePictureObjectStorage(builder.Configuration);
builder.Services.AddHostedService<AutoService.ApiService.Security.ExpiredTokenCleanupService>();

// Build.
var app = builder.Build();

// Maintenance entrypoint. The profile-picture verification needs the same DI graph as the API,
// but must not start the web host or the demo-data seeder, so it short-circuits right after Build().
if (ProfilePictureStorageMigrator.IsRequested(args))
{
    return await ProfilePictureStorageMigrator.RunAsync(app.Services, CancellationToken.None);
}

/** Outside Development, AllowedHosts must be explicit (no wildcard/localhost) or startup fails fast
    to block host-header injection attacks; see docs/deployment-security-checklist.md. */
if (!app.Environment.IsDevelopment())
{
    var allowedHosts = app.Configuration["AllowedHosts"];
    var hosts = allowedHosts?
        .Split(';', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
        .Select(static host => host.Trim())
        .Where(static host => host.Length > 0)
        .ToArray();

    var hasUnsafeAllowedHosts = hosts is null
        || hosts.Length == 0
        || hosts.Any(static host => host == "*" || host.Equals("localhost", StringComparison.OrdinalIgnoreCase));

    if (hasUnsafeAllowedHosts)
    {
        throw new InvalidOperationException(
            "In non-Development environments, AllowedHosts must be explicitly configured and must not contain wildcard (*) or localhost.");
    }

    InProcessLimiterTopologyGuard.Validate(app.Configuration, app.Environment);
}

// Ensure the database is created and seeded with demo data at startup.
await app.EnsureSeededAsync();

/** Middleware order below is a security contract (exception handling wraps everything; origin/CSRF
    checks precede auth); full order and rationale: docs/PROJECT-OVERVIEW.md. */
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var problemDetailsService = context.RequestServices.GetRequiredService<IProblemDetailsService>();
        var exceptionFeature = context.Features.Get<IExceptionHandlerFeature>();
        var statusCode = exceptionFeature?.Error is BadHttpRequestException badHttpRequestException
            ? badHttpRequestException.StatusCode
            : StatusCodes.Status500InternalServerError;

        context.Response.StatusCode = statusCode;

        await problemDetailsService.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = { Status = statusCode }
        });
    });
});

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
app.UseResponseCompression();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<LoginBanMiddleware>();
app.UseRateLimiter();
app.UseCors("WebUIPolicy");
app.UseMiddleware<UnsafeCookieRequestOriginMiddleware>();
app.UseMiddleware<CsrfDoubleSubmitMiddleware>();
app.UseMiddleware<AuditAccessDeniedMiddleware>();
app.UseAuthentication();
app.UseAuthorization();

/** Endpoint map groups by domain module. */
app.MapAuthEndpoints();
app.MapAppointmentEndpoints();
app.MapProfileEndpoints();
app.MapAdminEndpoints();
app.MapCustomerEndpoints();
app.MapVehicleEndpoints();
app.MapPartEndpoints();
app.MapLaborTypeEndpoints();
app.MapQuoteEndpoints();
app.MapCompanyResultEndpoints();

app.MapDefaultEndpoints();

app.Run();

return 0;
