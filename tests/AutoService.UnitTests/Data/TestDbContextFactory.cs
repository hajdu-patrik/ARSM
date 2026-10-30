using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.UnitTests.Data;

/** A context on the Npgsql provider that is never opened: enough to build the model and run SaveChanges validation. */
internal static class TestDbContextFactory
{
    public static AutoServiceDbContext Create() => new(
        new DbContextOptionsBuilder<AutoServiceDbContext>()
            .UseNpgsql("Host=localhost;Database=unit-test;Username=unit-test")
            .Options);
}
