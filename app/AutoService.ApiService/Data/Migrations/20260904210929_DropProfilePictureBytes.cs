using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{
    /**
     * Drops the transitional {@code people."ProfilePicture"} bytea column.
     *
     * Only safe once the backfill gate query returns zero, because the column holds the sole copy
     * of any picture the object-storage backfill has not reached:
     *   SELECT COUNT(*) FROM people
     *   WHERE "ProfilePicture" IS NOT NULL AND "ProfilePictureObjectKey" IS NULL;
     */
    public partial class DropProfilePictureBytes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfilePicture",
                table: "people");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // This restores the column, not its contents: the dropped bytes are unrecoverable from
            // here. A real rollback needs the pg_dump taken before Up() ran.
            migrationBuilder.AddColumn<byte[]>(
                name: "ProfilePicture",
                table: "people",
                type: "bytea",
                nullable: true);
        }
    }
}
