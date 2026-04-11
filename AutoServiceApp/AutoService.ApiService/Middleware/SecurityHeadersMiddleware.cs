namespace AutoService.ApiService.Middleware;

public sealed class SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment environment)
{
    private const string ContentTypeOptions = "nosniff";
    private const string FrameOptions = "DENY";
    private const string ReferrerPolicy = "strict-origin-when-cross-origin";
    private const string PermissionsPolicy = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";
    private const string ApiContentSecurityPolicy = "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(static state =>
        {
            var (httpContext, isDevelopmentEnvironment) = ((HttpContext, bool))state;
            var headers = httpContext.Response.Headers;

            AppendIfMissing(headers, "X-Content-Type-Options", ContentTypeOptions);
            AppendIfMissing(headers, "X-Frame-Options", FrameOptions);
            AppendIfMissing(headers, "Referrer-Policy", ReferrerPolicy);
            AppendIfMissing(headers, "Permissions-Policy", PermissionsPolicy);

            var path = httpContext.Request.Path;
            var shouldSkipCspForDevTools = isDevelopmentEnvironment &&
                (path.StartsWithSegments("/openapi", StringComparison.OrdinalIgnoreCase) ||
                 path.StartsWithSegments("/scalar", StringComparison.OrdinalIgnoreCase));

            if (!shouldSkipCspForDevTools)
            {
                AppendIfMissing(headers, "Content-Security-Policy", ApiContentSecurityPolicy);
            }

            return Task.CompletedTask;
        }, (context, environment.IsDevelopment()));

        await next(context);
    }

    private static void AppendIfMissing(IHeaderDictionary headers, string name, string value)
    {
        if (!headers.ContainsKey(name))
        {
            headers.Append(name, value);
        }
    }
}