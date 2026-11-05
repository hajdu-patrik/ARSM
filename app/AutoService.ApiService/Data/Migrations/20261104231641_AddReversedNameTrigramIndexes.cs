using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    public partial class AddReversedNameTrigramIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // One raw-SQL trigram index per "last first [middle]" upper(...) expression the searches emit,
            // as in AddTrigramSearchIndexes; kept outside the EF model on purpose.
            migrationBuilder.Sql(
                """
                CREATE INDEX "IX_people_LastName_FirstName_Trgm"
                    ON people USING gin (upper("LastName" || ' ' || "FirstName") gin_trgm_ops);
                CREATE INDEX "IX_people_LastName_FirstName_MiddleName_Trgm"
                    ON people USING gin (upper("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") gin_trgm_ops);
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP INDEX "IX_people_LastName_FirstName_MiddleName_Trgm";
                DROP INDEX "IX_people_LastName_FirstName_Trgm";
                """);
        }
    }
}
