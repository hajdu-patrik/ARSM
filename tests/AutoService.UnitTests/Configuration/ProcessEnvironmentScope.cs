namespace AutoService.UnitTests.Configuration;

/** Runs the env-reading tests alone, because they change process-wide variables. */
[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class ProcessEnvironmentCollection
{
    public const string Name = "Process environment";
}

/** Clears the named variables for a test and restores the originals on dispose. */
internal sealed class ProcessEnvironmentScope : IDisposable
{
    private readonly Dictionary<string, string?> originals;

    public ProcessEnvironmentScope(params string[] names)
    {
        originals = names.ToDictionary(name => name, Environment.GetEnvironmentVariable);

        foreach (var name in names)
        {
            Environment.SetEnvironmentVariable(name, null);
        }
    }

    public void Set(string name, string? value) => Environment.SetEnvironmentVariable(name, value);

    public void Dispose()
    {
        foreach (var (name, value) in originals)
        {
            Environment.SetEnvironmentVariable(name, value);
        }
    }
}
