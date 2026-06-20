using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Menu.API.Migrations
{
    /// <inheritdoc />
    public partial class FixDishSnapshotShadowFK : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DishSnapshots_Dishes_DishId1",
                table: "DishSnapshots");

            migrationBuilder.DropIndex(
                name: "IX_DishSnapshots_DishId1",
                table: "DishSnapshots");

            migrationBuilder.DropColumn(
                name: "DishId1",
                table: "DishSnapshots");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DishId1",
                table: "DishSnapshots",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DishSnapshots_DishId1",
                table: "DishSnapshots",
                column: "DishId1");

            migrationBuilder.AddForeignKey(
                name: "FK_DishSnapshots_Dishes_DishId1",
                table: "DishSnapshots",
                column: "DishId1",
                principalTable: "Dishes",
                principalColumn: "Id");
        }
    }
}
