/**
 * 20260403074955_AddRefreshTokensAndCookieAuth.cs
 *
 * Auto-generated documentation header for this source file.
 */

﻿using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{public partial class AddRefreshTokensAndCookieAuth : Migration
    {protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "refreshtokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MechanicId = table.Column<int>(type: "integer", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReplacedByTokenHash = table.Column<string>(type: "text", nullable: true),
                    CreatedByIpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CreatedByUserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refreshtokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_refreshtokens_people_MechanicId",
                        column: x => x.MechanicId,
                        principalTable: "people",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_refreshtokens_MechanicId_ExpiresAtUtc",
                table: "refreshtokens",
                columns: new[] { "MechanicId", "ExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_refreshtokens_TokenHash",
                table: "refreshtokens",
                column: "TokenHash",
                unique: true);
        }protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "refreshtokens");
        }
    }
}
