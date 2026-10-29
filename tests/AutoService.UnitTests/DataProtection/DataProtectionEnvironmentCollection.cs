namespace AutoService.UnitTests.DataProtection;

/** Runs the DataProtection tests alone, because the resolver reads process-wide 'DataProtection__*' variables. */
[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class DataProtectionEnvironmentCollection
{
    public const string Name = "DataProtection environment";
}
