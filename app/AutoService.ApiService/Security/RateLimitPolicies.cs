using System.Globalization;
using System.Threading.RateLimiting;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Middleware;
using Microsoft.AspNetCore.RateLimiting;

namespace AutoService.ApiService.Security;

/** The fixed-window rate limits of the API, partitioned per client (anonymous routes) or per signed-in
    person; the Development limits leave room for the local test suites (ApiService/CLAUDE.md). */
internal static class RateLimitPolicies
{
    internal const string AuthLogin = "AuthLoginAttempts";
    internal const string AuthRefresh = "AuthRefreshAttempts";
    internal const string ProfileCredentials = "ProfileCredentialAttempts";
    internal const string ProfilePictureUpload = "ProfilePictureUploads";
    internal const string StaffEmailSends = "StaffEmailSends";
    internal const string QuotePdfRenders = "QuotePdfRenders";
    internal const string CompanyResultReports = "CompanyResultReports";

    internal const int QuotePdfPermitLimit = 30;
    internal const int CompanyResultPermitLimit = 30;

    private const int DevelopmentPermitLimit = 300;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    internal static IServiceCollection AddArsmRateLimiting(this IServiceCollection services, IHostEnvironment environment)
    {
        var isDevelopment = environment.IsDevelopment();

        services.AddSingleton(_ => new QuoteSendRateLimiter(isDevelopment));

        return services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = OnLoginRejectedAsync;

            options.AddPolicy(AuthLogin, context => PerClient(context, Relaxed(10, isDevelopment)));
            options.AddPolicy(AuthRefresh, context => PerClient(context, 20));
            options.AddPolicy(ProfileCredentials, context => PerPerson(context, Relaxed(5, isDevelopment)));
            options.AddPolicy(ProfilePictureUpload, context => PerPerson(context, Relaxed(10, isDevelopment)));
            options.AddPolicy(StaffEmailSends, context => PerPerson(context, Relaxed(5, isDevelopment)));
            options.AddPolicy(QuotePdfRenders, context => QuotePdfPartition(context, isDevelopment));
            options.AddPolicy(CompanyResultReports, context => CompanyResultPartition(context, isDevelopment));
        });
    }

    /** The per-person partition of the quote PDF render route (30 per minute, Development 300). */
    internal static RateLimitPartition<string> QuotePdfPartition(HttpContext context, bool isDevelopment)
        => PerPerson(context, Relaxed(QuotePdfPermitLimit, isDevelopment));

    /** The per-person partition of the company results route (30 per minute, Development 300). */
    internal static RateLimitPartition<string> CompanyResultPartition(HttpContext context, bool isDevelopment)
        => PerPerson(context, Relaxed(CompanyResultPermitLimit, isDevelopment));

    /** Only the login route bans the client and explains the rejection; every other 429 stays bodiless. */
    private static async ValueTask OnLoginRejectedAsync(OnRejectedContext context, CancellationToken cancellationToken)
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
    }

    /** The production limit, or the Development limit that leaves room for the local test suites. */
    internal static int Relaxed(int productionLimit, bool isDevelopment)
        => isDevelopment ? DevelopmentPermitLimit : productionLimit;

    /** Partitioned per client address, so one noisy client cannot lock out every other user. */
    private static RateLimitPartition<string> PerClient(HttpContext context, int permitLimit)
        => FixedWindow(LoginBanMiddleware.ResolveClientKey(context), permitLimit);

    /** Partitioned per signed-in person (the limiter runs after authentication); the client key is the anonymous fallback. */
    internal static RateLimitPartition<string> PerPerson(HttpContext context, int permitLimit, TimeSpan? window = null)
        => FixedWindow(
            context.User.TryGetPersonId(out var personId) ? $"person:{personId}" : LoginBanMiddleware.ResolveClientKey(context),
            permitLimit,
            window);

    private static RateLimitPartition<string> FixedWindow(string partitionKey, int permitLimit, TimeSpan? window = null)
        => RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = window ?? Window,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
}
