namespace AutoService.ApiService.Domain.UniqueTypes;

/**
 * Value object representing a person's full name.
 */
public sealed class FullName
{
    public string FirstName { get; private set; } = string.Empty;
    public string? MiddleName { get; private set; }
    public string LastName { get; private set; } = string.Empty;

    /**
     * Parameterless constructor required by EF Core.
     */
    private FullName() { }

    /**
     * Creates a full name value.
     *
     * @param firstName First name.
     * @param middleName Optional middle name.
     * @param lastName Last name.
     */
    public FullName(string firstName, string? middleName, string lastName)
    {
        FirstName = firstName;
        MiddleName = middleName;
        LastName = lastName;
    }

    /**
     * Converts the value object to a readable full-name string.
     *
     * @return A formatted full-name string.
     */
    public override string ToString() => string.IsNullOrWhiteSpace(MiddleName)
        ? $"{FirstName} {LastName}"
        : $"{FirstName} {MiddleName} {LastName}";
}