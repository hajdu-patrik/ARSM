namespace AutoService.ApiService.Middleware;

/** The one login-route matcher (case-insensitive, optional trailing slash, as routing accepts it). */
internal static class LoginPathMatcher
{
    private const string LoginPath = "/api/auth/login";

    internal static bool IsLoginPath(PathString path)
    {
        return path.Equals(LoginPath, StringComparison.OrdinalIgnoreCase)
            || path.Equals(LoginPath + "/", StringComparison.OrdinalIgnoreCase);
    }
}
