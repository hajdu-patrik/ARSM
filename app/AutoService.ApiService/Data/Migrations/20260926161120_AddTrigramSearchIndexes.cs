using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    public partial class AddTrigramSearchIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // GET /api/customers/by-name keeps its `.ToUpper().Contains(term)` predicate, which Npgsql sends as
            // `upper(<expr>) LIKE @p` with p = '%' + escaped term + '%'. Only a trigram index can serve a
            // leading-wildcard LIKE, and PostgreSQL uses an expression index only when the query contains the
            // same expression, so each index repeats one generated upper(...) expression verbatim (see
            // Customers/CustomerEndpoints.Lookup.cs). Raw SQL because the EF index API cannot express
            // `USING gin (<expression> gin_trgm_ops)`; the indexes stay out of the EF model on purpose, so the
            // model diff never proposes dropping them.
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
            // pg_trgm stays installed. Up used IF NOT EXISTS, so Down cannot tell whether this migration created
            // it, and DROP EXTENSION would either remove an extension something outside this schema relies on or
            // abort the whole rollback when an object still depends on it. Nothing in this schema uses it once
            // the indexes are gone.
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
