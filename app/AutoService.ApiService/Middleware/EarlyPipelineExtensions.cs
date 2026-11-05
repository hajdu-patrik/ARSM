namespace AutoService.ApiService.Middleware;

/** The early request pipeline segment of Program.cs, one method so its order is unit-testable. */
internal static class EarlyPipelineExtensions
{
    internal const string WebUiCorsPolicyName = "WebUIPolicy";

    /** Forwarded headers before HSTS and HTTPS redirection; CORS before the login ban, so its 429s carry CORS headers. */
    internal static IApplicationBuilder UseArsmEarlyPipeline(this IApplicationBuilder app, bool isDevelopment)
    {
        app.UseForwardedHeaders();

        if (!isDevelopment)
        {
            app.UseHsts();
        }

        app.UseHttpsRedirection();
        app.UseResponseCompression();
        app.UseMiddleware<SecurityHeadersMiddleware>();
        app.UseCors(WebUiCorsPolicyName);
        app.UseMiddleware<LoginBanMiddleware>();

        return app;
    }
}
