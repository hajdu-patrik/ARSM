using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    public partial class VehicleSchemaRefactor : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_EnginePowerHp",
                table: "vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_EngineTorqueNm",
                table: "vehicles");

            migrationBuilder.RenameColumn(
                name: "EnginePowerHp",
                table: "vehicles",
                newName: "EnginePowerKw");

            migrationBuilder.Sql("""
                UPDATE vehicles
                SET "EnginePowerKw" = round("EnginePowerKw" * 0.735499)::integer;
                """);

            migrationBuilder.DropColumn(
                name: "EngineTorqueNm",
                table: "vehicles");

            migrationBuilder.AddColumn<string>(
                name: "DrivetrainType",
                table: "vehicles",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Vin",
                table: "vehicles",
                type: "character varying(17)",
                maxLength: 17,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE vehicles
                SET "DrivetrainType" = CASE "LicensePlate"
                    WHEN 'ABC-101' THEN 'Petrol'
                    WHEN 'BCD-202' THEN 'Hybrid'
                    WHEN 'CDE-303' THEN 'Electric'
                    WHEN 'DEF-404' THEN 'Petrol'
                    WHEN 'EFG-505' THEN 'Diesel'
                    ELSE 'Petrol'
                END,
                "Vin" = CASE "LicensePlate"
                    WHEN 'ABC-101' THEN 'WVWZZZAUZJW123456'
                    WHEN 'BCD-202' THEN 'JTDBR32E720123456'
                    WHEN 'CDE-303' THEN '5YJ3E1EA7NF123456'
                    WHEN 'DEF-404' THEN 'WF0PXXGCDPJL12345'
                    WHEN 'EFG-505' THEN 'WBA8E1C57JA123456'
                    ELSE 'ARS' || lpad("Id"::text, 14, '0')
                END;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "DrivetrainType",
                table: "vehicles",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(16)",
                oldMaxLength: 16,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Vin",
                table: "vehicles",
                type: "character varying(17)",
                maxLength: 17,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(17)",
                oldMaxLength: 17,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_vehicles_Vin",
                table: "vehicles",
                column: "Vin",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_EnginePowerKw",
                table: "vehicles",
                sql: "\"EnginePowerKw\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_Vin",
                table: "vehicles",
                sql: "\"Vin\" ~ '^[A-HJ-NPR-Z0-9]{17}$'");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_vehicles_Vin",
                table: "vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_EnginePowerKw",
                table: "vehicles");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Vehicles_Vin",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "DrivetrainType",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "Vin",
                table: "vehicles");

            migrationBuilder.RenameColumn(
                name: "EnginePowerKw",
                table: "vehicles",
                newName: "EnginePowerHp");

            migrationBuilder.Sql("""
                UPDATE vehicles
                SET "EnginePowerHp" = round("EnginePowerHp" / 0.735499)::integer;
                """);

            migrationBuilder.AddColumn<int>(
                name: "EngineTorqueNm",
                table: "vehicles",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_EnginePowerHp",
                table: "vehicles",
                sql: "\"EnginePowerHp\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Vehicles_EngineTorqueNm",
                table: "vehicles",
                sql: "\"EngineTorqueNm\" >= 0");
        }
    }
}
