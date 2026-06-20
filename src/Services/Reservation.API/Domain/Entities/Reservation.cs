using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Reservation.API.Domain.Entities;

public enum ReservationStatus
{
    Booked = 1,     // Đã đặt, chờ khách đến
    CheckedIn = 2,  // Khách đã đến
    Cancelled = 3   // Đã hủy
}

public enum DepositStatus
{
    None = 0,       // Không yêu cầu cọc
    Pending = 1,    // Chờ thanh toán cọc
    Paid = 2,       // Đã nộp cọc
    Refunded = 3,   // Đã hoàn tiền
    Forfeited = 4   // Mất cọc (bùng lịch)
}

public class Reservation
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("guestName")]
    public string GuestName { get; set; } = string.Empty;

    [BsonElement("guestPhone")]
    public string GuestPhone { get; set; } = string.Empty;

    [BsonElement("guestEmail")]
    public string? GuestEmail { get; set; }

    [BsonElement("tableId")]
    public int? TableId { get; set; }
    [BsonElement("tableNumber")]
    public int? TableNumber { get; set; }

    [BsonElement("numberOfPeople")]
    public int NumberOfPeople { get; set; }

    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public ReservationStatus Status { get; set; } = ReservationStatus.Booked;

    [BsonElement("reservationDate")]
    public DateTime ReservationDate { get; set; }

    [BsonElement("depositAmount")]
    public decimal DepositAmount { get; set; }

    [BsonElement("depositStatus")]
    [BsonRepresentation(BsonType.String)]
    public DepositStatus DepositStatus { get; set; } = DepositStatus.None;

    [BsonElement("note")]
    public string? Note { get; set; }

    [BsonElement("accountId")]
    public int? AccountId { get; set; } // Staff xử lý

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}