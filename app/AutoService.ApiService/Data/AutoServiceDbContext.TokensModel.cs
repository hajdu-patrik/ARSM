using AutoService.ApiService.Domain;
using AutoService.ApiService.Security;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Data;

public sealed partial class AutoServiceDbContext
{
    /** Configures the token tables (RefreshToken, RevokedJwtToken): columns, indexes and the mechanic cascade. */
    private void ConfigureTokensModel(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refreshtokens");

            entity.Property(x => x.TokenHash)
                .HasMaxLength(128)
                .IsRequired();

            entity.Property(x => x.CreatedByIpAddress)
                .HasMaxLength(64);

            entity.Property(x => x.CreatedByUserAgent)
                .HasMaxLength(RefreshToken.MaxUserAgentLength);

            entity.HasIndex(x => x.TokenHash)
                .IsUnique();

            entity.HasIndex(x => new { x.MechanicId, x.ExpiresAtUtc });

            entity.HasOne(x => x.Mechanic)
                .WithMany()
                .HasForeignKey(x => x.MechanicId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RevokedJwtToken>(entity =>
        {
            entity.ToTable("revokedjwttokens");

            entity.Property(x => x.JwtId)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(x => x.RevokedAtUtc)
                .IsRequired();

            entity.Property(x => x.ExpiresAtUtc)
                .IsRequired();

            entity.HasIndex(x => x.JwtId)
                .IsUnique();

            entity.HasIndex(x => x.ExpiresAtUtc);
        });
    }
}
