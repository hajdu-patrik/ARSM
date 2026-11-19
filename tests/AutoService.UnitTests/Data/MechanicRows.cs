namespace AutoService.UnitTests.Data;

/** The stored row of a mechanic as ScriptedRowsInterceptor serves it; every column the model requires is set. */
internal static class MechanicRows
{
    internal static Dictionary<string, object?> Row(int id, string? identityUserId) => new()
    {
        ["Id"] = id,
        ["PersonType"] = "Mechanic",
        ["FirstName"] = "Béla",
        ["LastName"] = "Szabó",
        ["Email"] = "bela@example.test",
        ["Specialization"] = "All",
        ["Expertise"] = "Engine",
        ["MustChangePassword"] = false,
        ["IdentityUserId"] = identityUserId,
    };
}
