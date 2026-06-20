using Menu.API.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;

namespace Menu.API.Infrastructure.Persistence;

public class MenuDbContext : DbContext
{
    public MenuDbContext(DbContextOptions<MenuDbContext> options) : base(options) { }
  
    public DbSet<Dish> Dishes { get; set; }
    public DbSet<DishSnapshot> DishSnapshots { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MenuDbContext).Assembly);
    }
}