using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.Domain;

/**
 * Abstract base entity for all person-like domain objects.
 */
public abstract class People
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }
    
    public required FullName Name { get; set; }
    
    [MaxLength(150)]
    public required string Email { get; set; }

    // Null for customers, who do not have login accounts.
    public string? IdentityUserId { get; set; }
    
    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    public byte[]? ProfilePicture { get; set; }

    [MaxLength(50)]
    public string? ProfilePictureContentType { get; set; }


    /**
     * Parameterless constructor required by EF Core.
     */
    protected People() { }

    /**
     * Creates a person with required fields.
     *
     * @param name Full name value object.
     * @param email Person email address.
     * @param phoneNumber Optional phone number.
     */
    [SetsRequiredMembers]
    protected People(FullName name, string email, string? phoneNumber)
    {
        Name = name;
        Email = email;
        PhoneNumber = phoneNumber;
    }
}