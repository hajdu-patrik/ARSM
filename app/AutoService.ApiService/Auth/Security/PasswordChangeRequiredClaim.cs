namespace AutoService.ApiService.Auth.Security;

/** The access-token claim a mechanic on an admin-set temporary password carries until the password is changed. */
internal static class PasswordChangeRequiredClaim
{
    internal const string Type = "pwd_change_required";
    internal const string Value = "true";
}
