using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "quotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuoteNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ValidUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DecidedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VehicleId = table.Column<int>(type: "integer", nullable: false),
                    AppointmentId = table.Column<int>(type: "integer", nullable: true),
                    CreatedByMechanicId = table.Column<int>(type: "integer", nullable: true),
                    TotalNet = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalVat = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalGross = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quotes", x => x.Id);
                    table.CheckConstraint("CK_Quotes_Totals", "\"TotalGross\" = \"TotalNet\" + \"TotalVat\"");
                    table.ForeignKey(
                        name: "FK_quotes_appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_quotes_people_CreatedByMechanicId",
                        column: x => x.CreatedByMechanicId,
                        principalTable: "people",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_quotes_vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quotelines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    QuoteId = table.Column<int>(type: "integer", nullable: false),
                    LineKind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    PartId = table.Column<int>(type: "integer", nullable: true),
                    LaborTypeId = table.Column<int>(type: "integer", nullable: true),
                    Description = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NetUnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    VatRatePercent = table.Column<int>(type: "integer", nullable: false),
                    NetAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    VatAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    GrossAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quotelines", x => x.Id);
                    table.CheckConstraint("CK_QuoteLines_LineKindIntegrity", "(\"LineKind\" = 'Part' AND \"LaborTypeId\" IS NULL) OR (\"LineKind\" = 'Labor' AND \"PartId\" IS NULL)");
                    table.CheckConstraint("CK_QuoteLines_NetUnitPrice", "\"NetUnitPrice\" >= 0 AND \"NetUnitPrice\" <= 100000000");
                    table.CheckConstraint("CK_QuoteLines_Quantity", "\"Quantity\" > 0 AND \"Quantity\" <= 10000");
                    table.CheckConstraint("CK_QuoteLines_VatRate", "\"VatRatePercent\" IN (0,5,18,27)");
                    table.ForeignKey(
                        name: "FK_quotelines_labortypes_LaborTypeId",
                        column: x => x.LaborTypeId,
                        principalTable: "labortypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_quotelines_parts_PartId",
                        column: x => x.PartId,
                        principalTable: "parts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_quotelines_quotes_QuoteId",
                        column: x => x.QuoteId,
                        principalTable: "quotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_quotelines_LaborTypeId",
                table: "quotelines",
                column: "LaborTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_quotelines_PartId",
                table: "quotelines",
                column: "PartId");

            migrationBuilder.CreateIndex(
                name: "IX_quotelines_QuoteId",
                table: "quotelines",
                column: "QuoteId");

            migrationBuilder.CreateIndex(
                name: "IX_quotes_AppointmentId",
                table: "quotes",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_quotes_CreatedAt",
                table: "quotes",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_quotes_CreatedByMechanicId",
                table: "quotes",
                column: "CreatedByMechanicId");

            migrationBuilder.CreateIndex(
                name: "IX_quotes_QuoteNumber",
                table: "quotes",
                column: "QuoteNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_quotes_Status",
                table: "quotes",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_quotes_VehicleId",
                table: "quotes",
                column: "VehicleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "quotelines");

            migrationBuilder.DropTable(
                name: "quotes");
        }
    }
}
