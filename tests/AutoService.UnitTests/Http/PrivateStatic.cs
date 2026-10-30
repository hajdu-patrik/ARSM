using System.Reflection;
using System.Runtime.ExceptionServices;

namespace AutoService.UnitTests.Http;

/** Calls the private static helpers of the endpoint classes by name; pass an args array to read back out parameters. */
internal static class PrivateStatic
{
    private const BindingFlags Flags = BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Static;

    internal static T Call<T>(Type owner, string name, params object?[] args) => (T)Run(owner, name, args)!;

    internal static object? Run(Type owner, string name, object?[] args)
    {
        var method = owner.GetMethod(name, Flags)
            ?? throw new MissingMethodException(owner.FullName, name);

        try
        {
            return method.Invoke(null, args);
        }
        catch (TargetInvocationException ex) when (ex.InnerException is not null)
        {
            ExceptionDispatchInfo.Capture(ex.InnerException).Throw();
            throw;
        }
    }

    /** Sets the database-generated Id, which has a private setter. */
    internal static T WithId<T>(T entity, int id) where T : notnull
    {
        // A private setter is only visible on the declaring type, so look it up there.
        var property = entity.GetType().GetProperty("Id")!;
        var declared = property.DeclaringType!.GetProperty(
            "Id", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly)!;
        declared.SetValue(entity, id);
        return entity;
    }
}
