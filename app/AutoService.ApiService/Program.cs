using AutoService.ApiService.Admin;
using AutoService.ApiService.Appointments;
using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Auth.Security;
using AutoService.ApiService.Auth.Session;
using AutoService.ApiService.Catalog;
using AutoService.ApiService.CompanyProfiles;
using AutoService.ApiService.Configuration;
using AutoService.ApiService.Customers;
using AutoService.ApiService.Data;
using AutoService.ApiService.DataInitialization;
using AutoService.ApiService.DataProtection;
using AutoService.ApiService.Email.Sending;
using AutoService.ApiService.Middleware;
using AutoService.ApiService.Profile.Endpoints;
using AutoService.ApiService.Quotes;
using AutoService.ApiService.Quotes.Pdf;
using AutoService.ApiService.Realtime;
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
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.IO.Compression;
using System.Net;
using System.Text;
using OpenTelemetry.Trace;
using Scalar.AspNetCore;

/** API service entrypoint: resolves config, registers services, orders middleware, and maps
    endpoints; fails fast on invalid security config (appsettings.Local.json is local-only). */
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

/** Every body is JSON of a few kilobytes; the profile picture upload lifts this limit for its own route only. */
const int JsonRequestBodyLimitBytes = 64 * 1024;
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = JsonRequestBodyLimitBytes);

/** DB readiness check, added here (not ServiceDefaults) to keep those Npgsql-free; carries no
    "live" tag, so /alive stays process-only while /health also reflects DB connectivity. */
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>(nameof(AutoServiceDbContext), timeout: DatabaseHealthCheck.RegistrationTimeout);

/** EF Core/Npgsql command spans in OpenTelemetry traces; registered here (not in ServiceDefaults)
    to keep the shared defaults free of a Postgres dependency. */
builder.Services.ConfigureOpenTelemetryTracerProvider(tracing => tracing.AddNpgsql());

// Optional local overrides for running EF CLI/API outside AppHost.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.AddOpenApi();

// Backs the global exception handler registered below in the middleware pipeline.
builder.Services.AddProblemDetails();

var connectionString = ConnectionStringResolver.Resolve(builder.Configuration);

/** Quote PDF runtime setup, resolved here (not the handler); see Quote Anchors in
    ApiService/CLAUDE.md (QuestPDF license, fonts); the letterhead lives in the database. */
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
QuestPDF.Settings.UseSystemFonts = false;
QuestPDF.Settings.ThrowOnMissingTextGlyphs = true;
QuoteDocumentAssets.RegisterFonts();

/** Transient failures are retried; every explicit transaction therefore runs through
    Data/TransactionalExecution, which the retrying strategy requires. */
builder.Services.AddDbContext<AutoServiceDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsql => npgsql.EnableRetryOnFailure());
});

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

var jwtSecret = JwtSettingsResolver.ResolveSecret(builder.Configuration);

/** JwtSettings:ExpirationMinutes drives the access-token cookie lifetime and the JWT exp claim; set
    once here, read-only afterwards via AuthEndpoints.AccessTokenTtl. */
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
    // The admin password reset goes through Identity's own reset token, which needs this provider.
    .AddDefaultTokenProviders();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        /** JWT bearer events: reads the access token from the cookie when the Authorization header is
            missing, and fails auth on a revoked token (AccessTokenValidation). */
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
            OnTokenValidated = AccessTokenValidation.OnTokenValidatedAsync,
        };

        options.TokenValidationParameters = JwtValidationParameters.Create(jwtSecret, jwtIssuer, jwtAudience);
    });

builder.Services.AddArsmRateLimiting(builder.Environment);

/** Brotli/Gzip response compression (HTTPS included); safe from BREACH because tokens travel only as HttpOnly cookies, never in JSON bodies. SSE stays uncompressed. */
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
builder.Services.AddSingleton<IJwtTokenIssuer>(sp => new JwtTokenIssuer(jwtSecret, jwtIssuer, jwtAudience, sp.GetRequiredService<ISessionRevocationService>()));

// One denylist instance serves the requests and warms itself from the table as a hosted service.
builder.Services.AddSingleton<TokenDenylistService>();
builder.Services.AddSingleton<ITokenDenylistService>(sp => sp.GetRequiredService<TokenDenylistService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<TokenDenylistService>());

// Both live channels are also reachable as IUserSubscriptions, so a session revocation closes a person's streams.
builder.Services.AddSingleton<IProfilePictureUpdateBroadcaster, ProfilePictureUpdateBroadcaster>();
builder.Services.AddSingleton<IAppointmentUpdateBroadcaster, AppointmentUpdateBroadcaster>();
builder.Services.AddSingleton<IUserSubscriptions>(sp => sp.GetRequiredService<IProfilePictureUpdateBroadcaster>());
builder.Services.AddSingleton<IUserSubscriptions>(sp => sp.GetRequiredService<IAppointmentUpdateBroadcaster>());
builder.Services.AddSingleton<ISessionRevocationService, SessionRevocationService>();
builder.Services.AddHostedService<SessionRevocationWarmupService>();

builder.Services.AddSingleton<ICompanyProfileWriteBack, CompanyProfileWriteBack>();
builder.Services.AddSingleton<IProfilePictureProcessor, SkiaProfilePictureProcessor>();
builder.Services.AddProfilePictureObjectStorage(builder.Configuration);
builder.Services.AddArsmDataProtection(builder.Configuration);
// Resend sender when Email:ResendApiKey is set, otherwise a logging no-op (dev, CI, unit tests).
builder.Services.AddArsmEmail(builder.Configuration);
builder.Services.AddHostedService<ExpiredTokenCleanupService>();
// Options emitted by app.UseHsts(); preload stays off so no host is committed to browser preload lists.
builder.Services.AddHsts(HstsConfiguration.Configure);

var app = builder.Build();

// Maintenance entrypoints. The profile-picture verification needs the same DI graph as the API,
// but must not start the web host or the database initializer, so it short-circuits right after Build().
if (ProfilePictureStorageMigrator.IsRequested(args))
{
    return await ProfilePictureStorageMigrator.RunAsync(app.Services, CancellationToken.None);
}

// The Azure migration job: migrates as the administrator and provisions arsm_app; it serves no HTTP.
if (DatabaseMigrationCommand.IsRequested(args))
{
    return await DatabaseMigrationCommand.RunAsync(app, CancellationToken.None);
}

/** Outside Development, AllowedHosts must be explicit (no wildcard/localhost) or startup fails fast
    to block host-header injection attacks. */
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

// Migrate and normalize the database at startup (no data is seeded) unless Database:MigrateOnStartup is false.
if (DatabaseInitializer.IsMigrateOnStartupEnabled(app.Configuration))
{
    await app.EnsureDatabaseReadyAsync();
}

// One-time letterhead seed from CompanyProfile config; fails fast when the table and config are empty.
await app.EnsureCompanyProfileAsync();

// First-admin bootstrap from Bootstrap:Admin, after migrations; a no-op once any admin exists.
await app.EnsureBootstrapAdminAsync();

/** Middleware order below is a security contract (errors wrap everything; origin/CSRF checks precede auth;
    the per-person limits and the password gate need the user); see app/AutoService.ApiService/CLAUDE.md. */
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

// Forwarded headers first: behind a proxy HSTS and HTTPS redirection must see the original https scheme.
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}
else
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseResponseCompression();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<LoginBanMiddleware>();
app.UseCors("WebUIPolicy");
app.UseMiddleware<UnsafeCookieRequestOriginMiddleware>();
app.UseMiddleware<CsrfDoubleSubmitMiddleware>();
app.UseMiddleware<AuditAccessDeniedMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<PasswordChangeRequiredMiddleware>();
app.UseRateLimiter();

app.MapAuthEndpoints();
app.MapAppointmentEndpoints();
app.MapProfileEndpoints();
app.MapAdminEndpoints();
app.MapCustomerEndpoints();
app.MapVehicleEndpoints();
app.MapPartEndpoints();
app.MapLaborTypeEndpoints();
app.MapQuoteEndpoints();
app.MapCompanyProfileEndpoints();
app.MapCompanyResultEndpoints();

app.MapDefaultEndpoints();

app.Run();

return 0;
