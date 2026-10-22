using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPhoneIndexPasswordResetAndRowVersions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MustChangePassword",
                table: "people",
                type: "boolean",
                nullable: true,
                defaultValue: false);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "parts",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "labortypes",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "appointments",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            // Same precedence the start-up normalizer used before this index existed: a mechanic keeps the
            // number over a customer, the lowest id over a later duplicate; the others lose their phone.
            migrationBuilder.Sql("""
                UPDATE people AS p
                SET "PhoneNumber" = NULL
                WHERE p."PhoneNumber" IS NOT NULL
                  AND EXISTS (
                      SELECT 1
                      FROM people AS o
                      WHERE o."PhoneNumber" = p."PhoneNumber"
                        AND o."Id" <> p."Id"
                        AND (CASE WHEN o."PersonType" = 'Mechanic' THEN 0 ELSE 1 END, o."Id")
                            < (CASE WHEN p."PersonType" = 'Mechanic' THEN 0 ELSE 1 END, p."Id"));
                """);

            migrationBuilder.CreateIndex(
                name: "IX_people_PhoneNumber",
                table: "people",
                column: "PhoneNumber",
                unique: true,
                filter: "\"PhoneNumber\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_people_PhoneNumber",
                table: "people");

            migrationBuilder.DropColumn(
                name: "MustChangePassword",
                table: "people");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "parts");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "labortypes");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "appointments");
        }
    }
}
