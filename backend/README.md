# Microservices Restaurant QR API

A modern microservices-based system for managing restaurant operations with QR code functionality. Built with .NET 10, featuring service-to-service communication, API Gateway, JWT authentication, and comprehensive database management.

## 📋 Project Overview

This is a production-grade microservices architecture for a restaurant management system that enables:
- **Menu Management**: Browse and manage restaurant dishes with snapshots
- **Order Management**: Place orders through tables with real-time updates via SignalR
- **Reservation System**: Manage restaurant reservations with MongoDB persistence
- **Identity & Authentication**: JWT-based user and guest authentication with role-based access control
- **Guest Experience**: Generate guest tokens for dining customers to place orders independently
- **Bill Management**: Track and manage bills per table

---

## 🏗️ Architecture

### Microservices Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY (YARP)                       │
│              (Port 3000 - Reverse Proxy)                     │
└────────┬──────────────────────┬──────────────┬──────────────┘
         │                      │              │
    ┌────▼────┐           ┌─────▼─────┐  ┌───▼──────┐
    │Identity  │           │   Order   │  │   Menu   │
    │  API     │           │   API     │  │   API    │
    │(3001)    │           │  (3003)   │  │ (3002)   │
    └──────────┘           └───┬──────┘  └──────────┘
                                │
                          ┌─────▼──────┐
                          │Reservation │
                          │    API     │
                          │  (3004)    │
                          └────────────┘
```

### Service Responsibilities

#### 1. **Identity.API** (Port 3001)
- **Purpose**: Authentication and account management
- **Database**: SQL Server (IdentityDb)
- **Key Features**:
  - JWT token generation (AccessToken & RefreshToken)
  - Account registration and login with rate limiting (5 requests/minute)
  - Role-based authorization (SuperAdmin, Admin, Staff)
  - Password hashing with BCrypt
  - Refresh token cleanup background job
  - Health checks for SQL Server
  - Serilog logging with Application Insights integration

**Tech Stack**:
- Entity Framework Core 10.0.6
- BCrypt.Net-Next 4.1.0
- Serilog with Application Insights
- AspNetCore.HealthChecks.SqlServer

#### 2. **Menu.API** (Port 3002)
- **Purpose**: Menu and dish management
- **Database**: SQL Server (MenuDb)
- **Key Features**:
  - CRUD operations for dishes
  - Dish snapshots (price history tracking)
  - File upload utility for dish images
  - Static file serving from wwwroot/images
  - OpenAPI/Swagger documentation

**Tech Stack**:
- Entity Framework Core 10.0.6
- File handling middleware
- OpenAPI integration

#### 3. **Order.API** (Port 3003)
- **Purpose**: Order and table management for restaurant operations
- **Database**: SQL Server (OrderDb)
- **Key Features**:
  - Table management (status tracking)
  - Order creation and tracking
  - Guest-based ordering (with session IDs)
  - Bill generation and management
  - Real-time order updates via SignalR (OrderHub)
  - Guest JWT token generation for QR code customers
  - Integration with Menu API for dish snapshots
  - Health checks for SQL Server

**Tech Stack**:
- Entity Framework Core 10.0.6
- SignalR for real-time communication
- GuestJwtUtil for temporary guest access tokens
- HttpClient for Menu API integration

#### 4. **Reservation.API** (Port 3004)
- **Purpose**: Restaurant reservation management
- **Database**: MongoDB
- **Key Features**:
  - Reservation booking and cancellation
  - Guest reservation tracking
  - Availability management
  - Health checks for MongoDB

**Tech Stack**:
- MongoDB Driver 3.1.0
- AspNetCore.HealthChecks.MongoDb
- Serilog logging

#### 5. **Gateway.API** (Port 3000)
- **Purpose**: Single entry point for all client requests
- **Pattern**: API Gateway with YARP (Yet Another Reverse Proxy)
- **Key Features**:
  - Route all requests to appropriate microservices
  - JWT validation and propagation
  - OpenTelemetry and Application Insights monitoring
  - Azure Container Apps support

**Tech Stack**:
- YARP.ReverseProxy 2.3.0
- Azure Monitor OpenTelemetry

---

## 📊 Database Architecture

### SQL Server Databases

#### IdentityDb (Identity.API)
```
Tables:
├── Accounts
│   ├── Id (PK)
│   ├── Email (unique)
│   ├── Name
│   ├── Role (enum: SuperAdmin, Admin, Staff)
│   ├── Password (hashed)
│   ├── CreatedAt
│   └── UpdatedAt
└── RefreshTokens
    ├── Id (PK)
    ├── AccountId (FK)
    ├── Token
    ├── ExpiresAt
    └── RevokedAt (nullable)
```

#### MenuDb (Menu.API)
```
Tables:
├── Dishes
│   ├── Id (PK)
│   ├── Name
│   ├── Description
│   ├── Price
│   ├── Category
│   ├── ImagePath
│   ├── IsAvailable
│   ├── CreatedAt
│   └── UpdatedAt
└── DishSnapshots
    ├── Id (PK)
    ├── DishId (FK)
    ├── Price (snapshot at order time)
    ├── Name
    └── CreatedAt
```

#### OrderDb (Order.API)
```
Tables:
├── Tables
│   ├── Id (PK)
│   ├── TableNumber (unique)
│   ├── Capacity
│   ├── Status (enum: Available, Occupied, Reserved)
│   └── UpdatedAt
├── Guests
│   ├── Id (PK)
│   ├── TableId (FK)
│   ├── Name
│   ├── SessionId (for tracking)
│   ├── CreatedAt
│   └── UpdatedAt
├── Orders
│   ├── Id (PK)
│   ├── GuestId (FK)
│   ├── TableId (FK)
│   ├── DishSnapshotId (snapshot from Menu API)
│   ├── Quantity
│   ├── Status (enum: Pending, Preparing, Served, Cancelled)
│   ├── Notes
│   ├── CreatedAt
│   └── UpdatedAt
└── Bills
    ├── Id (PK)
    ├── TableId (FK)
    ├── TotalAmount
    ├── Status (enum: Open, Paid, Cancelled)
    ├── PaymentMethod
    ├── CreatedAt
    └── UpdatedAt (with indexes on TableId, Status)
```

### MongoDB Collections

#### Reservations (Reservation.API)
```
Document Structure:
{
  _id: ObjectId,
  guestName: string,
  guestEmail: string,
  guestPhone: string,
  reservationDate: DateTime,
  numberOfGuests: int,
  tableNumber: int,
  notes: string,
  status: enum (Confirmed, Cancelled, Completed),
  createdAt: DateTime,
  updatedAt: DateTime
}
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure

#### AccessToken (issued by Identity.API)
```
Payload:
- sub: account email
- role: user role (SuperAdmin, Admin, Staff)
- email: account email
- iat: issued at timestamp
- exp: expiration timestamp (configurable)
```

#### Guest Token (issued by Order.API)
```
Payload:
- sub: guest id
- sessionId: session tracking id
- table: table number
- iat: issued at timestamp
- exp: short-lived (configurable in appsettings)
```

### Rate Limiting
- **Login Endpoint**: 5 requests/minute per IP
- **General API**: 100 requests/minute per IP
- **Custom Response**: Includes `Retry-After` header

---

## 🚀 Getting Started

### Prerequisites
- .NET 10 SDK
- SQL Server 2019+
- MongoDB 5.0+
- Visual Studio 2022 or VS Code

### Local Development Setup

#### 1. Clone Repository
```bash
git clone https://github.com/deV-inh08/Microservices_RestaurantQR_API.git
cd Microservices_RestaurantQR_API
```

#### 2. Configure Connection Strings

Create/update `appsettings.Development.json` for each service:

**Identity.API** - `src/Services/Identity.API/appsettings.Development.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "IdentityDb": "Server=(localdb)\\mssqllocaldb;Database=IdentityDb;Integrated Security=true;"
  },
  "Jwt": {
    "Issuer": "RestaurantQR",
    "Audience": "RestaurantQR",
    "AccessTokenSecret": "your-super-secret-key-min-32-chars-long-secure",
    "RefreshTokenSecret": "your-super-secret-refresh-key-min-32-chars-long",
    "AccessTokenExpiresInMinutes": 60,
    "RefreshTokenExpiresInDays": 7
  }
}
```

**Menu.API** - `src/Services/Menu.API/appsettings.Development.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "MenuDb": "Server=(localdb)\\mssqllocaldb;Database=MenuDb;Integrated Security=true;"
  }
}
```

**Order.API** - `src/Services/Order.API/appsettings.Development.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "OrderDb": "Server=(localdb)\\mssqllocaldb;Database=OrderDb;Integrated Security=true;"
  },
  "GuestJwt": {
    "Issuer": "RestaurantQR",
    "Audience": "RestaurantQR",
    "AccessTokenSecret": "your-guest-token-secret-min-32-chars",
    "AccessTokenExpiresInMinutes": 480
  },
  "MenuApi": {
    "BaseUrl": "http://localhost:3002"
  }
}
```

**Reservation.API** - `src/Services/Reservation.API/appsettings.Development.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "MongoDb": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "ReservationDb"
  },
  "Jwt": {
    "Issuer": "RestaurantQR",
    "Audience": "RestaurantQR",
    "AccessTokenSecret": "your-reservation-secret-key"
  }
}
```

#### 3. Run Database Migrations

```bash
# Identity.API
cd src/Services/Identity.API
dotnet ef database update

# Menu.API
cd src/Services/Menu.API
dotnet ef database update

# Order.API
cd src/Services/Order.API
dotnet ef database update

# Note: Reservation.API uses MongoDB (no EF migrations needed)
```

#### 4. Start Services

**Option A: Run individually in different terminals**
```bash
# Terminal 1 - Gateway
cd Gateway.API
dotnet run

# Terminal 2 - Identity.API
cd src/Services/Identity.API
dotnet run

# Terminal 3 - Menu.API
cd src/Services/Menu.API
dotnet run

# Terminal 4 - Order.API
cd src/Services/Order.API
dotnet run

# Terminal 5 - Reservation.API
cd src/Services/Reservation.API
dotnet run
```

All services will start on their designated ports:
- Gateway: http://localhost:3000
- Identity: http://localhost:3001
- Menu: http://localhost:3002
- Order: http://localhost:3003
- Reservation: http://localhost:3004

### Docker Deployment

Each service includes a Dockerfile. Build and run:

```bash
# Build all images
docker build -f Gateway.API/Dockerfile -t gateway-api:latest .
docker build -f src/Services/Identity.API/Dockerfile -t identity-api:latest .
docker build -f src/Services/Menu.API/Dockerfile -t menu-api:latest .
docker build -f src/Services/Order.API/Dockerfile -t order-api:latest .
docker build -f src/Services/Reservation.API/Dockerfile -t reservation-api:latest .

# Run with Docker Compose (if available)
docker-compose up -d
```

---

## 📡 API Endpoints

### Gateway (Port 3000)
```
GET  /                    → Routes to all microservices
```

### Identity.API (Port 3001)
```
POST   /api/v1/auth/login                → User login
POST   /api/v1/auth/refresh-token        → Refresh access token
GET    /api/v1/accounts                  → List accounts (Admin only)
POST   /api/v1/accounts/register         → Register new account
DELETE /api/v1/accounts/{id}             → Delete account (Admin only)
GET    /health                           → Liveness check
GET    /health/ready                     → Readiness check
GET    /openapi/v1.json                  → OpenAPI specification
```

### Menu.API (Port 3002)
```
GET    /api/v1/dishes                    → Get all dishes
GET    /api/v1/dishes/{id}               → Get dish by ID
POST   /api/v1/dishes                    → Create dish (requires auth)
PUT    /api/v1/dishes/{id}               → Update dish (requires auth)
DELETE /api/v1/dishes/{id}               → Delete dish (requires auth)
POST   /api/v1/dishes/{id}/image         → Upload dish image
GET    /health                           → Liveness check
GET    /health/ready                     → Readiness check
GET    /openapi/v1.json                  → OpenAPI specification
```

### Order.API (Port 3003)
```
GET    /api/v1/tables                    → Get all tables (requires auth)
POST   /api/v1/tables                    → Create table (requires auth)
PUT    /api/v1/tables/{id}               → Update table (requires auth)

GET    /api/v1/guests                    → Get all guests
POST   /api/v1/guests/login              → QR guest login (generates token)

POST   /api/v1/orders                    → Create order (requires guest/user token)
GET    /api/v1/orders/table/{tableId}    → Get table orders (requires auth)
PUT    /api/v1/orders/{id}               → Update order (requires auth)

GET    /api/v1/bills/table/{tableId}     → Get bills by table (requires auth)
POST   /api/v1/bills/{tableId}           → Create bill (requires auth)
PUT    /api/v1/bills/{id}/pay            → Mark bill as paid (requires auth)

GET    /health                           → Liveness check
GET    /health/ready                     → Readiness check
GET    /openapi/v1.json                  → OpenAPI specification

WebSocket: /orderHub                     → Real-time order updates (SignalR)
```

### Reservation.API (Port 3004)
```
GET    /api/v1/reservations              → Get all reservations
POST   /api/v1/reservations              → Create reservation
GET    /api/v1/reservations/{id}         → Get reservation by ID
PUT    /api/v1/reservations/{id}         → Update reservation
DELETE /api/v1/reservations/{id}         → Cancel reservation

GET    /health                           → Liveness check
GET    /health/ready                     → Readiness check
GET    /openapi/v1.json                  → OpenAPI specification
```

---

## 🧪 Testing

### Running Tests

```bash
# Identity.API tests
cd tests/Identity.API.Tests
dotnet test

# Order.API tests
cd tests/Order.API.Tests
dotnet test

# Menu.API tests
cd tests/Menu.API.Tests
dotnet test

# Reservation.API tests
cd tests/Reservation.API.Tests
dotnet test

# Run all tests
dotnet test --no-build
```

### Test Coverage
Each service test project includes:
- Unit tests for services
- Integration tests for APIs
- Mock external dependencies

---

## 📝 Project Structure

```
RestaurantAPI/
├── Gateway.API/
│   ├── Program.cs                        # Gateway configuration & routes
│   ├── appsettings.json                  # Default settings
│   ├── appsettings.Development.json      # Dev environment
│   ├── appsettings.Production.json       # Production settings
│   ├── Gateway.API.csproj
│   └── Dockerfile
│
├── src/Services/
│   │
│   ├── Identity.API/                     # Authentication & authorization
│   │   ├── Domain/Entities/
│   │   │   ├── Account.cs                # User account entity
│   │   │   └── RefreshToken.cs           # Refresh token entity
│   │   ├── Application/
│   │   │   ├── Services/
│   │   │   │   ├── AuthService.cs        # Login, token generation
│   │   │   │   └── AccountService.cs     # Account management
│   │   │   ├── Interfaces/
│   │   │   ├── DTOs/AuthDTO.cs           # API request/response DTOs
│   │   │   └── Mapper/AccountMapper.cs
│   │   ├── Infrastructure/
│   │   │   ├── Persistence/
│   │   │   │   ├── IdentityDbContext.cs  # EF Core context
│   │   │   │   ├── Configurations/       # Entity configurations
│   │   │   │   └── DatabaseSeeder.cs     # Initial data
│   │   │   ├── Utils/
│   │   │   │   ├── JwtUtil.cs            # JWT generation/validation
│   │   │   │   └── PasswordUtil.cs       # Password hashing
│   │   │   └── BackgroundJobs/
│   │   │       └── RefreshTokenCleanupJob.cs
│   │   ├── API/
│   │   │   ├── Controllers/
│   │   │   │   ├── AuthController.cs     # Login endpoints
│   │   │   │   └── AccountController.cs  # Account endpoints
│   │   │   └── Middleware/GlobalExceptionMiddleware.cs
│   │   ├── Migrations/
│   │   ├── Properties/launchSettings.json
│   │   ├── Program.cs
│   │   ├── Identity.API.csproj
│   │   └── Dockerfile
│   │
│   ├── Menu.API/                         # Menu & dish management
│   │   ├── Domain/Entities/
│   │   │   ├── Dish.cs                   # Dish entity
│   │   │   └── DishSnapshot.cs           # Price history snapshot
│   │   ├── Application/
│   │   │   ├── Services/MenuService.cs   # Business logic
│   │   │   └── DTOs/MenuDTOs.cs
│   │   ├── Infrastructure/
│   │   │   ├── Persistence/
│   │   │   │   ├── MenuDbContext.cs      # EF Core context
│   │   │   │   ├── Configurations/
│   │   │   │   └── DatabaseSeeder.cs
│   │   │   └── Utils/FileUploadUtil.cs
│   │   ├── API/
│   │   │   ├── Controllers/MenuController.cs
│   │   │   │   DishSnapshotController.cs
│   │   │   └── Middleware/GlobalExceptionMiddleware.cs
│   │   ├── wwwroot/images/               # Uploaded dish images
│   │   ├── Migrations/
│   │   ├── Properties/launchSettings.json
│   │   ├── Program.cs
│   │   ├── Menu.API.csproj
│   │   └── Dockerfile
│   │
│   ├── Order.API/                        # Order & table management
│   │   ├── Domain/Entities/
│   │   │   ├── Order.cs                  # Order entity
│   │   │   ├── Table.cs                  # Restaurant table
│   │   │   ├── Guest.cs                  # Dining guest
│   │   │   └── Bill.cs                   # Bill/payment
│   │   ├── Application/
│   │   │   ├── Services/
│   │   │   │   ├── OrderService.cs       # Order operations
│   │   │   │   ├── TableService.cs       # Table management
│   │   │   │   ├── GuestService.cs       # Guest operations
│   │   │   │   └── BillService.cs        # Billing operations
│   │   │   ├── Interfaces/IGuestJwtUtil.cs
│   │   │   └── DTOs/
│   │   │       ├── OrderDTOs.cs
│   │   │       └── BillDTOs.cs
│   │   ├── Infrastructure/
│   │   │   ├── Persistence/
│   │   │   │   ├── OrderDbContext.cs     # EF Core context
│   │   │   │   ├── Configuration/        # Entity configurations
│   │   │   │   └── DatabaseSeeder.cs
│   │   │   ├── Utils/GuestJwtUtil.cs     # Guest token generation
│   │   │   └── ExternalServices/MenuAPIClient.cs
│   │   ├── API/
│   │   │   ├── Controllers/
│   │   │   │   ├── OrderController.cs
│   │   │   │   ├── TableController.cs
│   │   │   │   ├── GuestController.cs
│   │   │   │   └── BillController.cs
│   │   │   ├── Middleware/GlobalExceptionMiddleware.cs
│   │   │   └── Hubs/OrderHub.cs          # SignalR hub for real-time orders
│   │   ├── Migrations/
│   │   ├── Properties/launchSettings.json
│   │   ├── Program.cs
│   │   ├── Order.API.csproj
│   │   └── Dockerfile
│   │
│   └── Reservation.API/                  # Reservation management (MongoDB)
│       ├── Domain/Entities/
│       │   └── Reservation.cs            # Reservation entity (MongoDB)
│       ├── Application/
│       │   ├── Services/ReservationService.cs
│       │   └── DTOs/ReservationDTOs.cs
│       ├── Infrastructure/
│       │   ├── Persistence/
│       │   │   └── ReservationDbContext.cs (MongoDB context)
│       │   └── Utils/
│       ├── API/
│       │   ├── Controllers/ReservationController.cs
│       │   └── Middleware/GlobalExceptionMiddleware.cs
│       ├── Properties/launchSettings.json
│       ├── Program.cs
│       ├── Reservation.API.csproj
│       └── Dockerfile
│
├── BuildingBlocks/
│   ├── Shared.csproj                     # Shared library
│   ├── HealthChecks/HealthResponseWriter.cs
│   └── [Shared DTOs, utilities, etc.]
│
├── tests/
│   ├── Identity.API.Tests/
│   │   └── Unit/Services/AuthServiceTests.cs
│   ├── Order.API.Tests/
│   │   └── Unit/Services/OrderServiceTests.cs
│   ├── Menu.API.Tests/
│   │   └── Unit/Services/MenuServiceTests.cs
│   └── Reservation.API.Tests/
│       └── Unit/Services/ReservationServiceTests.cs
│
├── .gitignore
├── README.md                             # This file
├── docker-compose.yml                    # (Optional) for local orchestration
└── Solution file (.sln)
```

---

## 🔄 Service Communication Patterns

### Synchronous Communication (HTTP)
```
Order.API --HTTP--> Menu.API
  ├─ Fetch dish details
  ├─ Create dish snapshots
  └─ Get current prices

Order.API --HTTP--> Identity.API
  └─ Validate JWT tokens
```

### Asynchronous Communication (SignalR)
```
Order.API <--WebSocket--> Order.Hub <---> Clients
  └─ Real-time order status updates
    ├─ Order created
    ├─ Order in preparation
    └─ Order served
```

### Event Flow Example: Creating an Order
```
1. Client sends POST /api/v1/orders
2. Order.API validates guest token via Identity.API
3. Order.API fetches menu item via MenuAPIClient
4. Creates DishSnapshot for price locking
5. Creates Order record in OrderDb
6. Broadcasts update to all connected SignalR clients
7. Returns Order data to client
```

---

## 🛠️ Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | .NET | 10.0 | Web framework |
| **Language** | C# | 14.0 | Programming language |
| **API Gateway** | YARP | 2.3.0 | Request routing & load balancing |
| **ORM** | Entity Framework Core | 10.0.6 | SQL database access |
| **Primary DB** | SQL Server | 2019+ | Structured data storage |
| **NoSQL DB** | MongoDB | 5.0+ | Flexible document storage |
| **Authentication** | JWT Bearer | 10.0.6 | Token-based auth |
| **Real-time** | SignalR | 10.0.0 | WebSocket communication |
| **Password Hash** | BCrypt.Net-Next | 4.1.0 | Secure password storage |
| **Logging** | Serilog | 4.3.1 | Structured logging |
| **Monitoring** | Azure Monitor | 1.x | Performance monitoring |
| **Health Checks** | AspNetCore.HealthChecks | 9.0.0 | Service health endpoints |
| **API Docs** | Swagger/OpenAPI | 10.1.7 | Interactive API documentation |
| **Containerization** | Docker | Latest | Container images |

---

## 🔒 Security Considerations

### Authentication & Authorization
- ✅ JWT with strong secret keys (min 32 characters)
- ✅ Separate guest and admin tokens
- ✅ Configurable token expiration
- ✅ Refresh token rotation
- ✅ Role-based access control (RBAC)

### Data Protection
- ✅ Password hashing with BCrypt (salt rounds: 10)
- ✅ HTTPS enforcement in production
- ✅ SQL parameterized queries (via EF Core)
- ✅ CORS configuration (restrict origins in production)

### Rate Limiting
- ✅ Login endpoint: 5 requests/minute per IP
- ✅ General API: 100 requests/minute per IP
- ✅ Returns `Retry-After` header on rate limit

### Production Recommendations
- Store JWT secrets in Azure Key Vault
- Enable database encryption at rest
- Implement request logging and monitoring
- Regular security audits and dependency updates
- API versioning for backward compatibility

---

## 📈 Performance Optimizations

- **EF Core Configuration**
  - Connection pooling enabled
  - Lazy loading disabled (explicit loading)
  - Query optimization and indexing
  - Retry policy on transient failures

- **API Gateway**
  - YARP load balancing
  - Request/response caching strategies
  - Rate limiting to prevent DDoS

- **Real-time Updates**
  - SignalR for efficient WebSocket communication
  - Minimal payload serialization
  - Connection pooling for database access

- **Health Checks**
  - Fast liveness probes (no DB check)
  - Comprehensive readiness probes (includes DB)
  - Configurable check intervals

---

## 📞 Troubleshooting

### Database Connection Issues

**SQL Server Connection Failed**
```
Error: Cannot connect to SQL Server (provider: Named Pipes Provider, error: 40)

Solutions:
1. Verify SQL Server is running: Services.msc → SQL Server
2. Check connection string format
3. For LocalDB: (localdb)\mssqllocaldb
4. For named instance: Server=.\SQLEXPRESS
5. Test: sqlcmd -S (localdb)\mssqllocaldb
```

**MongoDB Connection Failed**
```
Error: Server returned error on SASL authentication step 1

Solutions:
1. Verify MongoDB is running
2. Check connection string format
3. Default: mongodb://localhost:27017
4. Test: mongosh "mongodb://localhost:27017"
```

### Migration Issues

**EF Core Migration Failed**
```bash
# View pending migrations
dotnet ef migrations list

# Add new migration
dotnet ef migrations add MigrationName

# Remove last migration
dotnet ef migrations remove

# View SQL being executed
dotnet ef migrations script
```

### Service-to-Service Communication

**Menu.API Unreachable from Order.API**
```
Solutions:
1. Verify Menu.API is running on http://localhost:3002
2. Check MenuApi:BaseUrl in Order.API appsettings.json
3. Review network configuration in production
4. Check firewall rules
```

---

## 🤝 Contributing Guidelines

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request with description

### Code Standards
- Follow C# naming conventions (PascalCase for public members)
- Use async/await for I/O operations
- Include XML documentation comments
- Write unit tests for new features
- Keep methods small and focused (single responsibility)

---

## 📚 Additional Resources

### Microsoft Documentation
- [.NET 10 Release Notes](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10)
- [Entity Framework Core](https://learn.microsoft.com/ef/core/)
- [ASP.NET Core Security](https://learn.microsoft.com/aspnet/core/security/)
- [SignalR Documentation](https://learn.microsoft.com/aspnet/core/signalr/)

### External Resources
- [YARP Documentation](https://microsoft.github.io/reverse-proxy/)
- [JWT.io](https://jwt.io/) - JWT decoder and documentation
- [MongoDB Official Docs](https://docs.mongodb.com/)
- [Serilog Documentation](https://github.com/serilog/serilog/wiki)
- [Azure Container Apps](https://learn.microsoft.com/azure/container-apps/)

### Useful Tools
- **Postman**: API testing and documentation
- **MongoDB Compass**: MongoDB GUI client
- **SQL Server Management Studio**: SQL Server management
- **DBeaver**: Universal database tool

---

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

MIT License allows:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use

Requires:
- ℹ️ License and copyright notice

---

## 👨‍💻 Project Information

- **Author**: deV-inh08
- **GitHub**: https://github.com/deV-inh08
- **Repository**: https://github.com/deV-inh08/Microservices_RestaurantQR_API
- **Created**: 2025
- **Status**: ✅ Production Ready
- **Last Updated**: April 23, 2025

---

## 📞 Support & Contact

### Getting Help
- **GitHub Issues**: [Open an issue](https://github.com/deV-inh08/Microservices_RestaurantQR_API/issues)
- **Discussions**: [Start a discussion](https://github.com/deV-inh08/Microservices_RestaurantQR_API/discussions)
- **Email**: Contact maintainer for private inquiries

### Report Security Issues
🔒 **Do not** open public issues for security vulnerabilities.  
Please email security details to the maintainer privately.

---

**Thank you for using Restaurant QR API! Happy coding! 🚀**