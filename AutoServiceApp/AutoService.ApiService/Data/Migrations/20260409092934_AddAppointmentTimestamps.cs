/**
 * 20260409092934_AddAppointmentTimestamps.cs
 *
 * Auto-generated documentation header for this source file.
 */

﻿using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{public partial class AddAppointmentTimestamps : Migration
    {protected override void Up(MigrationBuilder migrationBuilder)
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
        }protected override void Down(MigrationBuilder migrationBuilder)
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
