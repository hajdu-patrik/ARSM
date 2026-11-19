using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    /** Adds the pg_trgm GIN expression indexes behind the name and licence plate search. */
    public partial class AddTrigramSearchIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Trigram indexes for the upper(...) LIKE name/plate search (Pagination/PersonNameSearch.cs).
            // Raw SQL and outside the EF model on purpose; see the Trigram search note in ApiService CLAUDE.md.
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;");

            migrationBuilder.Sql(
                """
                CREATE INDEX "IX_people_FirstName_Trgm"
                    ON people USING gin (upper("FirstName") gin_trgm_ops);
                CREATE INDEX "IX_people_MiddleName_Trgm"
                    ON people USING gin (upper("MiddleName") gin_trgm_ops);
                CREATE INDEX "IX_people_LastName_Trgm"
                    ON people USING gin (upper("LastName") gin_trgm_ops);
                CREATE INDEX "IX_people_FirstName_LastName_Trgm"
                    ON people USING gin (upper("FirstName" || ' ' || "LastName") gin_trgm_ops);
                CREATE INDEX "IX_people_FirstName_MiddleName_LastName_Trgm"
                    ON people USING gin (upper("FirstName" || ' ' || "MiddleName" || ' ' || "LastName") gin_trgm_ops);

                CREATE INDEX "IX_vehicles_LicensePlate_Trgm"
                    ON vehicles USING gin (upper("LicensePlate") gin_trgm_ops);
                CREATE INDEX "IX_vehicles_LicensePlate_Compact_Trgm"
                    ON vehicles USING gin (upper(replace(replace("LicensePlate", ' ', ''), '-', '')) gin_trgm_ops);
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // pg_trgm stays installed: Up used IF NOT EXISTS, so Down cannot tell whether it created the
            // extension, and dropping it could break other objects.
            migrationBuilder.Sql(
                """
                DROP INDEX "IX_vehicles_LicensePlate_Compact_Trgm";
                DROP INDEX "IX_vehicles_LicensePlate_Trgm";
                DROP INDEX "IX_people_FirstName_MiddleName_LastName_Trgm";
                DROP INDEX "IX_people_FirstName_LastName_Trgm";
                DROP INDEX "IX_people_LastName_Trgm";
                DROP INDEX "IX_people_MiddleName_Trgm";
                DROP INDEX "IX_people_FirstName_Trgm";
                """);
        }
    }
}
