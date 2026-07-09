using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Order.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBillIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bills_TableId",
                table: "Bills");

            migrationBuilder.AlterColumn<string>(
                name: "GuestName",
                table: "Bills",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_Bills_SessionId",
                table: "Bills",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Bills_TableId_SessionId",
                table: "Bills",
                columns: new[] { "TableId", "SessionId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bills_SessionId",
                table: "Bills");

            migrationBuilder.DropIndex(
                name: "IX_Bills_TableId_SessionId",
                table: "Bills");

            migrationBuilder.AlterColumn<string>(
                name: "GuestName",
                table: "Bills",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(256)",
                oldMaxLength: 256);

            migrationBuilder.CreateIndex(
                name: "IX_Bills_TableId",
                table: "Bills",
                column: "TableId");
        }
    }
}
