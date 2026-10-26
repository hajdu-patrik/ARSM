namespace AutoService.ApiService.Auth.Session;

/** Cookie and header names shared by the auth/session and CSRF double-submit code paths; the cookies carry
    the __Host- prefix, so browsers keep them only when Secure, Path=/ and without a Domain attribute. */
internal static class AuthCookieNames
{
    public const string AccessToken = "__Host-arsm-access-token";
    public const string RefreshToken = "__Host-arsm-refresh-token";

    /** CSRF double-submit cookie; not HttpOnly so the WebUI can read it and echo it into CsrfHeaderName. */
    public const string CsrfToken = "__Host-arsm-csrf-token";

    /** Pre-rename cookie names; never issued any more, only deleted by ClearSessionCookies. */
    public const string LegacyAccessToken = "__Host-autoservice_at";
    public const string LegacyRefreshToken = "__Host-autoservice_rt";
    public const string LegacyCsrfToken = "__Host-autoservice_csrf";

    /** Header the WebUI must echo the CsrfToken cookie value into on unsafe cookie-bearing /api requests. */
    public const string CsrfHeaderName = "X-CSRF-Token";
}
