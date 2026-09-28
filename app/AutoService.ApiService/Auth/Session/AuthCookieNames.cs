namespace AutoService.ApiService.Auth.Session;

/** Cookie and header names shared by the auth/session and CSRF double-submit code paths. */
internal static class AuthCookieNames
{
    public const string AccessToken = "autoservice_at";
    public const string RefreshToken = "autoservice_rt";

    /** CSRF double-submit cookie; not HttpOnly so the WebUI can read it and echo it into CsrfHeaderName. */
    public const string CsrfToken = "autoservice_csrf";

    /** Header the WebUI must echo the CsrfToken cookie value into on unsafe cookie-bearing /api requests. */
    public const string CsrfHeaderName = "X-CSRF-Token";
}
