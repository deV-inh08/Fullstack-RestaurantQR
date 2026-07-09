using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Menu.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Dishes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Price = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ImagePath = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    Category = table.Column<int>(type: "int", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dishes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DishSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Price = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Category = table.Column<int>(type: "int", maxLength: 1000, nullable: false),
                    ImagePath = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    DishId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DishId1 = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DishSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DishSnapshots_Dishes_DishId",
                        column: x => x.DishId,
                        principalTable: "Dishes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DishSnapshots_Dishes_DishId1",
                        column: x => x.DishId1,
                        principalTable: "Dishes",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_DishSnapshots_DishId",
                table: "DishSnapshots",
                column: "DishId");

            migrationBuilder.CreateIndex(
                name: "IX_DishSnapshots_DishId1",
                table: "DishSnapshots",
                column: "DishId1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DishSnapshots");

            migrationBuilder.DropTable(
                name: "Dishes");
        }
    }
}
