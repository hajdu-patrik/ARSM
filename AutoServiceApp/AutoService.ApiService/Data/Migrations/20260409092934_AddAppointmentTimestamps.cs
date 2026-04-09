using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentTimestamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CanceledAt",
                table: "appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "appointments",
                type: "timestamp with time zone",
                nullable: true);

            // Data migration: 'Scheduled' was removed from ProgressStatus enum; migrate existing rows to 'InProgress'.
            migrationBuilder.Sql("UPDATE appointments SET \"Status\" = 'InProgress' WHERE \"Status\" = 'Scheduled';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CanceledAt",
                table: "appointments");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "appointments");
        }
    }
}
