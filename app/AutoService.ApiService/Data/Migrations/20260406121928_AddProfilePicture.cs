/**
 * 20260406121928_AddProfilePicture.cs
 *
 * Auto-generated documentation header for this source file.
 */

﻿using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{public partial class AddProfilePicture : Migration
    {protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "ProfilePicture",
                table: "people",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfilePictureContentType",
                table: "people",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfilePicture",
                table: "people");

            migrationBuilder.DropColumn(
                name: "ProfilePictureContentType",
                table: "people");
        }
    }
}
