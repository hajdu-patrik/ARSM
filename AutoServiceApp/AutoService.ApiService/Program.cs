using AutoService.ApiService.Admin;
using AutoService.ApiService.Appointments;
using AutoService.ApiService.Auth;
using AutoService.ApiService.Configuration;
using AutoService.ApiService.Customers;
using AutoService.ApiService.Data;
using AutoService.ApiService.DataInitialization;
using AutoService.ApiService.Middleware;
using AutoService.ApiService.Profile;
using AutoService.ApiService.Vehicles;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Globalization;
using System.Text;
using System.Threading.RateLimiting;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Optional local overrides for running EF CLI/API outside AppHost.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Service registration section.
builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();
builder.Services.AddDbContext<AutoServiceDbContext>(options =>
{
    options.UseNpgsql(ConnectionStringResolver.Resolve(builder.Configuration));
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
            OnTokenValidated = context =>
            {
                var jwtId = context.Principal?.FindFirst("jti")?.Value;

                if (!string.IsNullOrWhiteSpace(jwtId))
                {
                    var denylist = context.HttpContext.RequestServices.GetRequiredService<ITokenDenylistService>();
                    if (denylist.IsRevoked(jwtId))
                    {
                        context.Fail("Token has been revoked.");
                    }
                }

                return Task.CompletedTask;
            }
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
builder.Services.AddScoped<ITokenDenylistService, TokenDenylistService>();
builder.Services.AddSingleton<IProfilePictureUpdateBroadcaster, ProfilePictureUpdateBroadcaster>();

// Build.
var app = builder.Build();

// Ensure the database is created and seeded with demo data at startup.
await app.EnsureSeededAsync();

// -------------------------
// Middleware pipeline
// -------------------------
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
app.UseMiddleware<LoginBanMiddleware>();
app.UseRateLimiter();
app.UseCors("WebUIPolicy");
app.UseAuthentication();
app.UseAuthorization();

// Endpoint mapping.
app.MapAuthEndpoints();
app.MapAppointmentEndpoints();
app.MapProfileEndpoints();
app.MapAdminEndpoints();
app.MapCustomerEndpoints();
app.MapVehicleEndpoints();
app.MapDefaultEndpoints();

app.Run();