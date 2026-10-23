using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    /// <inheritdoc />
    public partial class QuoteAppointmentCascade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_quotes_appointments_AppointmentId",
                table: "quotes");

            migrationBuilder.AddForeignKey(
                name: "FK_quotes_appointments_AppointmentId",
                table: "quotes",
                column: "AppointmentId",
                principalTable: "appointments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_quotes_appointments_AppointmentId",
                table: "quotes");

            migrationBuilder.AddForeignKey(
                name: "FK_quotes_appointments_AppointmentId",
                table: "quotes",
                column: "AppointmentId",
                principalTable: "appointments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
