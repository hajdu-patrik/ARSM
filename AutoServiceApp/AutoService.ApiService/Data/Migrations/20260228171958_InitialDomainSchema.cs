using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialDomainSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "People",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FirstName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MiddleName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    LastName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    PersonType = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    Specialization = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Expertise = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_People", x => x.Id);
                    table.CheckConstraint("CK_Mechanics_Expertise_NotEmpty", "\"Expertise\" <> ''");
                });

            migrationBuilder.CreateTable(
                name: "Vehicles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LicensePlate = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Brand = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Model = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    MileageKm = table.Column<int>(type: "integer", nullable: false),
                    EnginePowerHp = table.Column<int>(type: "integer", nullable: false),
                    EngineTorqueNm = table.Column<int>(type: "integer", nullable: false),
                    CustomerId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vehicles", x => x.Id);
                    table.CheckConstraint("CK_Vehicles_EnginePowerHp", "\"EnginePowerHp\" >= 0");
                    table.CheckConstraint("CK_Vehicles_EngineTorqueNm", "\"EngineTorqueNm\" >= 0");
                    table.CheckConstraint("CK_Vehicles_MileageKm", "\"MileageKm\" >= 0");
                    table.CheckConstraint("CK_Vehicles_Year", "\"Year\" >= 1886 AND \"Year\" <= 2100");
                    table.ForeignKey(
                        name: "FK_Vehicles_People_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Appointments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ScheduledDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TaskDescription = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    VehicleId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Appointments_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AppointmentMechanics",
                columns: table => new
                {
                    AppointmentId = table.Column<int>(type: "integer", nullable: false),
                    MechanicId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppointmentMechanics", x => new { x.AppointmentId, x.MechanicId });
                    table.ForeignKey(
                        name: "FK_AppointmentMechanics_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AppointmentMechanics_People_MechanicId",
                        column: x => x.MechanicId,
                        principalTable: "People",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentMechanics_MechanicId",
                table: "AppointmentMechanics",
                column: "MechanicId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_ScheduledDate",
                table: "Appointments",
                column: "ScheduledDate");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_VehicleId",
                table: "Appointments",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_People_Email",
                table: "People",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_CustomerId",
                table: "Vehicles",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_LicensePlate",
                table: "Vehicles",
                column: "LicensePlate",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppointmentMechanics");

            migrationBuilder.DropTable(
                name: "Appointments");

            migrationBuilder.DropTable(
                name: "Vehicles");

            migrationBuilder.DropTable(
                name: "People");
        }
    }
}
