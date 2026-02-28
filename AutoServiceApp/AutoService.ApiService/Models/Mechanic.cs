using AutoService.ApiService.Models.UniqueTypes;
using System.Diagnostics.CodeAnalysis;

namespace AutoService.ApiService.Models;

/**
 * Mechanic entity derived from People.
 */
public class Mechanic : People
{
    public SpecializationType Specialization { get; set; }
    public List<ExpertiseType> Expertise { get; private set; } = new();

    /**
     * Parameterless constructor required by EF Core.
     */
    public Mechanic() {}

    /**
     * Creates a mechanic with specialization and expertise values.
     *
     * @param name Full name value object.
     * @param email Mechanic email address.
     * @param phoneNumber Optional phone number.
     * @param specialization Specialization group.
     * @param expertise Expertise values (1..10 unique entries).
     */
    [SetsRequiredMembers]
    public Mechanic(FullName name, string email, string? phoneNumber, SpecializationType specialization, List<ExpertiseType> expertise)
        : base(name, email, phoneNumber)
    {
        Specialization = specialization;
        SetExpertise(expertise);
    }


    /**
     * Sets and validates mechanic expertise values.
     *
     * @param expertise Expertise values that must contain 1..10 unique items.
     * @return No return value.
     */
    public void SetExpertise(IEnumerable<ExpertiseType> expertise)
    {
        var distinct = expertise.Distinct().ToList();

        if (distinct.Count is < 1 or > 10)
        {
            throw new ArgumentOutOfRangeException(nameof(expertise), "A mechanic must have at least 1 and at most 10 expertise items.");
        }

        Expertise = distinct;
    }

    // Appointments handled by this mechanic.
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}