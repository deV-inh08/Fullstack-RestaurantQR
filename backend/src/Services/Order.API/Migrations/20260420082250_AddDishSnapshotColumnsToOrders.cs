using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Order.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDishSnapshotColumnsToOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DishImage",
                table: "Orders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DishName",
                table: "Orders",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "DishPrice",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DishImage",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DishName",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DishPrice",
                table: "Orders");
        }
    }
}
