using Microsoft.EntityFrameworkCore;
using Order.API.Domain.Entities;

namespace Order.API.Infrastructure.Persistence;

public class OrderDbContext : DbContext
{
    public OrderDbContext(DbContextOptions<OrderDbContext> options) : base(options) { }

    public DbSet<Table> Tables => Set<Table>();
    public DbSet<Guest> Guests => Set<Guest>();
    public DbSet<Order.API.Domain.Entities.Order> Orders
        => Set<Order.API.Domain.Entities.Order>();
    public DbSet<Bill> Bills => Set<Bill>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(OrderDbContext).Assembly);
    }
}