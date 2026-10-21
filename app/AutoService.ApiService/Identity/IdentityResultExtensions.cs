using Microsoft.AspNetCore.Identity;

namespace AutoService.ApiService.Identity;

/** Turns an Identity failure into the code-keyed errors that Results.ValidationProblem expects. */
internal static class IdentityResultExtensions
{
    internal static Dictionary<string, string[]> ToValidationErrors(this IdentityResult result, string fallbackKey = "identity")
        => result.Errors
            .GroupBy(error => string.IsNullOrWhiteSpace(error.Code) ? fallbackKey : error.Code)
            .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());
}
