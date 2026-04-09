using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentIntakeAndDueDateTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DueDateTime",
                table: "appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "IntakeCreatedAt",
                table: "appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE appointments
                SET "IntakeCreatedAt" = COALESCE("CompletedAt", "CanceledAt", "ScheduledDate", now())
                WHERE "IntakeCreatedAt" IS NULL;

                UPDATE appointments
                SET "DueDateTime" = (COALESCE("CompletedAt", "CanceledAt", "ScheduledDate", now()) + interval '3 days')
                WHERE "DueDateTime" IS NULL;
                """);

            migrationBuilder.AlterColumn<DateTime>(
                name: "DueDateTime",
                table: "appointments",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "IntakeCreatedAt",
                table: "appointments",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_appointments_DueDateTime",
                table: "appointments",
                column: "DueDateTime");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_appointments_DueDateTime",
                table: "appointments");

            migrationBuilder.DropColumn(
                name: "DueDateTime",
                table: "appointments");

            migrationBuilder.DropColumn(
                name: "IntakeCreatedAt",
                table: "appointments");
        }
    }
}
