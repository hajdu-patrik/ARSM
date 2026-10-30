using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace AutoService.UnitTests.Data;

/** Looks entities, properties, indexes and foreign keys up in the built EF model, so a test reads as one line. */
internal static class ModelTestSupport
{
    public static IEntityType Entity<T>(this IModel model)
        => model.FindEntityType(typeof(T)) ?? throw new InvalidOperationException($"{typeof(T).Name} is not in the model.");

    public static IProperty Property(this IEntityType entity, string name)
        => entity.FindProperty(name) ?? throw new InvalidOperationException($"{entity.DisplayName()}.{name} is not mapped.");

    public static IIndex? Index(this IEntityType entity, params string[] properties)
        => entity.GetIndexes().SingleOrDefault(index => index.Properties.Select(property => property.Name).SequenceEqual(properties));

    public static bool HasUniqueIndex(this IEntityType entity, params string[] properties)
        => entity.Index(properties)?.IsUnique == true;

    public static IForeignKey ForeignKey(this IEntityType entity, string property)
        => entity.GetForeignKeys().Single(key => key.Properties.Count == 1 && key.Properties[0].Name == property);

    public static bool IsStoredAsString(this IProperty property, int maxLength)
        => property.GetProviderClrType() == typeof(string) && property.GetMaxLength() == maxLength;

    public static bool IsMoney(this IProperty property)
        => property.GetPrecision() == 18 && property.GetScale() == 2;

    public static bool IsXminVersion(this IProperty property)
        => property.IsConcurrencyToken
           && property.GetColumnName() == "xmin"
           && property.GetColumnType() == "xid"
           && property.ValueGenerated == ValueGenerated.OnAddOrUpdate;

    public static Dictionary<string, string> CheckConstraints(this IModel model)
        => model.GetEntityTypes()
            .SelectMany(entity => entity.GetCheckConstraints())
            .GroupBy(constraint => constraint.Name)
            .ToDictionary(group => group.Key, group => group.First().Sql);
}
