/**
 * 20260409200900_AddRevokedJwtTokenDenylist.cs
 *
 * Auto-generated documentation header for this source file.
 */

﻿using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{public partial class AddRevokedJwtTokenDenylist : Migration
    {protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "revokedjwttokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    JwtId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_revokedjwttokens", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_revokedjwttokens_ExpiresAtUtc",
                table: "revokedjwttokens",
                column: "ExpiresAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_revokedjwttokens_JwtId",
                table: "revokedjwttokens",
                column: "JwtId",
                unique: true);
        }protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "revokedjwttokens");
        }
    }
}
