using AutoService.ApiService.Linking;

namespace AutoService.UnitTests.Linking;

/** A mechanic who books a car for himself is linked to a hidden customer with a reserved, per-mechanic address. */
public sealed class CustomerOwnerLinkingTests
{
    [Theory]
    [InlineData(1, "mechanic-owner-1@customers.arsm.local")]
    [InlineData(42, "mechanic-owner-42@customers.arsm.local")]
    public void BuildMechanicOwnedCustomerEmail_embeds_the_mechanic_id_in_the_reserved_domain(int mechanicId, string expected)
    {
        Assert.Equal(expected, CustomerOwnerLinking.BuildMechanicOwnedCustomerEmail(mechanicId));
    }

    [Fact]
    public void Different_mechanics_never_share_an_address()
    {
        Assert.NotEqual(
            CustomerOwnerLinking.BuildMechanicOwnedCustomerEmail(1),
            CustomerOwnerLinking.BuildMechanicOwnedCustomerEmail(11));
    }

    [Fact]
    public void The_address_is_a_valid_normalized_email_so_the_stored_customer_can_be_found_again()
    {
        var email = CustomerOwnerLinking.BuildMechanicOwnedCustomerEmail(7);

        Assert.True(ApiService.Normalization.ContactNormalization.TryNormalizeEmail(email, out var normalized));
        Assert.Equal(email, normalized);
    }
}
