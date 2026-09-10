using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPricingCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "labortypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    HourlyNetRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    VatRatePercent = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_labortypes", x => x.Id);
                    table.CheckConstraint("CK_LaborTypes_HourlyNetRate", "\"HourlyNetRate\" >= 0 AND \"HourlyNetRate\" <= 100000000");
                    table.CheckConstraint("CK_LaborTypes_VatRate", "\"VatRatePercent\" IN (0,5,18,27)");
                });

            migrationBuilder.CreateTable(
                name: "parts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PartNumber = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    NetUnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    VatRatePercent = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parts", x => x.Id);
                    table.CheckConstraint("CK_Parts_NetUnitPrice", "\"NetUnitPrice\" >= 0 AND \"NetUnitPrice\" <= 100000000");
                    table.CheckConstraint("CK_Parts_VatRate", "\"VatRatePercent\" IN (0,5,18,27)");
                });

            migrationBuilder.CreateIndex(
                name: "IX_labortypes_Code",
                table: "labortypes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_parts_PartNumber",
                table: "parts",
                column: "PartNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "labortypes");

            migrationBuilder.DropTable(
                name: "parts");
        }
    }
}
