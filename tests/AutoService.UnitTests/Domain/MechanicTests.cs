using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.UnitTests.Domain;

/** A mechanic keeps 1 to 10 unique expertise items and starts without a forced password change. */
public sealed class MechanicTests
{
    private static Mechanic Create(params ExpertiseType[] expertise) =>
        new(new FullName("Béla", null, "Szabó"), "bela@example.test", null, SpecializationType.All, [.. expertise]);

    [Fact]
    public void The_constructor_copies_the_person_fields_and_the_expertise()
    {
        var mechanic = Create(ExpertiseType.Engine, ExpertiseType.Brakes);

        Assert.Equal("Béla Szabó", mechanic.Name.ToString());
        Assert.Equal("bela@example.test", mechanic.Email);
        Assert.Null(mechanic.PhoneNumber);
        Assert.Equal(SpecializationType.All, mechanic.Specialization);
        Assert.Equal(new[] { ExpertiseType.Engine, ExpertiseType.Brakes }, mechanic.Expertise);
        Assert.False(mechanic.MustChangePassword);
    }

    [Fact]
    public void SetExpertise_drops_duplicates_and_keeps_the_first_occurrence_order()
    {
        var mechanic = Create(ExpertiseType.Engine);

        mechanic.SetExpertise([ExpertiseType.Brakes, ExpertiseType.Engine, ExpertiseType.Brakes]);

        Assert.Equal(new[] { ExpertiseType.Brakes, ExpertiseType.Engine }, mechanic.Expertise);
    }

    [Fact]
    public void SetExpertise_accepts_all_ten_items()
    {
        var mechanic = Create(ExpertiseType.Engine);

        mechanic.SetExpertise(Enum.GetValues<ExpertiseType>());

        Assert.Equal(10, mechanic.Expertise.Count);
    }

    [Fact]
    public void SetExpertise_rejects_an_empty_list_and_keeps_the_previous_expertise()
    {
        var mechanic = Create(ExpertiseType.Engine);

        var error = Assert.Throws<ArgumentOutOfRangeException>(() => mechanic.SetExpertise([]));

        Assert.Equal("expertise", error.ParamName);
        Assert.Equal(new[] { ExpertiseType.Engine }, mechanic.Expertise);
    }

    [Fact]
    public void The_constructor_rejects_an_empty_expertise_list()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Create());
    }

    [Fact]
    public void SetExpertise_rejects_more_than_ten_items_after_the_duplicates_are_removed()
    {
        var mechanic = Create(ExpertiseType.Engine);
        var eleven = Enum.GetValues<ExpertiseType>().Append((ExpertiseType)99);

        Assert.Throws<ArgumentOutOfRangeException>(() => mechanic.SetExpertise(eleven));
        Assert.Equal(new[] { ExpertiseType.Engine }, mechanic.Expertise);
    }

    [Fact]
    public void Repeated_values_count_once_toward_the_limit()
    {
        var mechanic = Create(ExpertiseType.Engine);

        mechanic.SetExpertise(Enumerable.Repeat(ExpertiseType.Bodywork, 25));

        Assert.Equal(new[] { ExpertiseType.Bodywork }, mechanic.Expertise);
    }
}
