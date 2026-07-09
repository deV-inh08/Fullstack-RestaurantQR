using MongoDB.Driver;
using Reservation.API.Domain.Entities;

namespace Reservation.API.Infrastructure.Persistence;

public class MongoDbSettings
{
    public string ConnectionString { get; set; } = null!;
    public string DatabaseName { get; set; } = null!;
    public string ReservationsCollection { get; set; } = "Reservations";
}

public class ReservationDbContext
{
    private readonly IMongoDatabase _database;

    public ReservationDbContext(MongoDbSettings settings)
    {
        var client = new MongoClient(settings.ConnectionString);
        _database = client.GetDatabase(settings.DatabaseName);
    }

    public IMongoCollection<Reservation.API.Domain.Entities.Reservation> Reservations =>
        _database.GetCollection<Reservation.API.Domain.Entities.Reservation>("Reservations");
}