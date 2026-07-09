# agents.md — RestaurantQR System: Full Business & Technical Context

> **Purpose:** This file gives an AI agent (or developer) complete context of the entire RestaurantQR system — backend microservices + Next.js frontend — without needing to re-import source files. It covers business logic, domain rules, entity schemas, API endpoints, inter-service communication, auth flows, frontend architecture, and tech stack. Generated from actual source code.

---

## 1. Project Overview

**RestaurantQR (Viet Gold)** is a QR-code-based restaurant management system. It consists of:

- **3 active .NET 10 microservice backends** (Identity, Menu, Order)
- **1 scaffolded backend** (Reservation — entity only, not wired)
- **1 Next.js 14+ frontend** acting as both the admin dashboard and the guest ordering interface

Guests scan a QR code printed on a table to open the ordering interface in their browser — no app installation needed. They enter their name, browse the live menu, and place orders. Staff/admins manage everything through a protected admin panel at `/admin`.

### Backend Services

| Service | Port | Database | Status |
|---|---|---|---|
| `Identity.API` | 3001 | SQL Server (`IdentityDb`) | Complete |
| `Menu.API` | 3002 | SQL Server (`MenuDb`) | Complete |
| `Order.API` | 5219 | SQL Server (`OrderDb`) | Complete |
| `Reservation.API` | 3004 | MongoDB (planned) | Scaffold only |

### Frontend (Next.js)

| Concern | Detail |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (custom design system) |
| State / Data | TanStack Query (React Query) v5 |
| Forms | React Hook Form + Zod validation |
| UI Components | Custom + shadcn/ui + Radix UI primitives |
| Charts | Recharts |
| QR Code | `qrcode.react` |
| HTTP Layer | Custom `http.ts` wrapper around `fetch` |
| Notifications | Sonner (toast) |

---

## 2. Tech Stack (Backend)

| Concern | Technology |
|---|---|
| Framework | ASP.NET Core 10 (Controllers) |
| ORM | Entity Framework Core 10 (SQL Server) |
| Auth | Custom JWT Bearer — no ASP.NET Identity |
| Password Hashing | BCrypt.Net-Next (work factor 12) |
| API Docs | OpenAPI (built-in) + SwaggerUI |
| Inter-service HTTP | Typed `HttpClient` (`MenuApiClient`) |
| Serialization | `System.Text.Json` + `JsonStringEnumConverter` |
| Migrations | EF Core code-first |
| Exception Handling | Custom `GlobalExceptionMiddleware` (identical in all 3 active services) |

---

## 3. Identity.API — Account & Auth Service

**Base URL:** `http://localhost:3001/api/v1`

### 3.1 Domain Entities

#### `Account`
```
Id          int (PK, identity)
Name        string (max 256, required)
Email       string (max 256, required, unique index) — stored lowercase
Password    string (max 512, required) — BCrypt hash
Avatar      string (max 2048) — defaults to empty string
Role        UserRole enum stored as string (max 20)
CreatedAt   DateTime (UTC)
UpdatedAt   DateTime (UTC)
RefreshTokens  ICollection<RefreshToken>
```

#### `UserRole` enum
```
SuperAdmin = 1
Admin      = 2
Staff      = 3
```

#### `RefreshToken`
```
Token       string (PK, max 512) — the raw JWT string itself
AccountId   int (FK → Accounts, CASCADE delete)
ExpiresAt   DateTime (UTC) — 7 days from issue
CreatedAt   DateTime (UTC)
Account     Account  — nav property
```
Indexes on `Token`, `ExpiresAt`, and `AccountId`.

### 3.2 JWT Strategy

Two separate secrets, both configured in `Jwt` section of `appsettings.json`:

| Token | Config Key | Expiry | Stored in DB? |
|---|---|---|---|
| Access Token | `Jwt:AccessTokenSecret` | 15 min | No — stateless |
| Refresh Token | `Jwt:RefreshTokenSecret` | 7 days | Yes — in `RefreshTokens` table |

**Access Token Claims:** `userId`, `role`, `email`, `tokenType=AccessToken`, `jti`
**Refresh Token Claims:** `userId`, `tokenType=RefreshToken`, `jti`

**Rotate-on-use:** Calling `/auth/refresh-token` hard-deletes the old token and issues a new pair. Prevents replay attacks.

**On `change-password`:** ALL refresh tokens for that account are deleted from DB, forcing logout on all devices.

**Email change is not supported** — changing email means a new identity. This is by design (noted in frontend code comments and UI labels).

### 3.3 Role Hierarchy & Business Rules

```
SuperAdmin  →  creates/updates/deletes Admins (POST /account/admin)
Admin       →  creates/updates/deletes Staff (POST /account/staff)
Both        →  can GET all accounts, GET by ID, PUT /account/{id}, DELETE /account/{id}
Any logged-in user  →  GET /account/me, PUT /account/me, PUT /account/change-password
```

- SuperAdmin seeded at startup if `Accounts` table is empty.
- Seed credentials: `superAdmin1@restaurant.com` / `SuperAdmin1@123678`
- Emails normalized to lowercase before save and lookup.
- Names and emails are trimmed.
- `confirmPassword` validation is done **in the service layer** (not just schema), throwing `ArgumentException` on mismatch.

### 3.4 API Endpoints

#### `AuthController` (`/auth`) — no class-level `[Authorize]`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Anonymous | Login → returns `AccountDto` + token pair |
| POST | `/auth/refresh-token` | Anonymous | Body: `{ refreshToken }` → new token pair |
| POST | `/auth/logout` | `[Authorize]` | Body: `{ refreshToken }` → hard-delete token from DB |

**Login Response shape:**
```json
{
  "message": "Login successfully",
  "data": {
    "account": { "id", "name", "email", "role", "avatar", "createdAt", "updatedAt" },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### `AccountController` (`/account`) — class-level `[Authorize]`

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/account/me` | Any authenticated | Get own profile |
| PUT | `/account/me` | Any authenticated | Body: `{ name, avatar? }` |
| PUT | `/account/change-password` | Any authenticated | Body: `{ oldPassword, newPassword, confirmPassword }` — revokes all refresh tokens |
| GET | `/account` | SuperAdmin, Admin | Paginated list. Query: `?page=1&pageSize=20` |
| GET | `/account/{id}` | SuperAdmin, Admin | Get by ID |
| POST | `/account/admin` | SuperAdmin only | Create Admin account |
| POST | `/account/staff` | SuperAdmin, Admin | Create Staff account |
| PUT | `/account/{id}` | SuperAdmin, Admin | Update `{ name, email, avatar? }` |
| DELETE | `/account/{id}` | SuperAdmin, Admin | Delete account |

**Pagination:** `GetAllAsync(PaginationParams p)` uses `p.Skip` / `p.Take`. Returns `PaginatedResponse<AccountDto>` with `{ data, total, page, pageSize, totalPages }`.

**`AccountDto` shape:**
```json
{
  "id": 1,
  "name": "Super Admin",
  "email": "superadmin1@restaurant.com",
  "role": "SuperAdmin",
  "avatar": null,
  "createdAt": "2026-04-15T07:33:21Z",
  "updatedAt": "2026-04-15T07:33:21Z"
}
```

**Note:** `CreateAdmin` and `CreateStaff` both call the same private `CreateAccountAsync(name, email, password, confirmPassword, role)` — the deduplication is already done in `AccountService`.

---

## 4. Menu.API — Dish & Snapshot Service

**Base URL:** `http://localhost:3002/api/v1`

### 4.1 Domain Entities

#### `Dish`
```
Id           int (PK, identity)
Name         string (max 256, required)
Price        int (required, > 0)
Description  string? (max 1000)
ImagePath    string? (max 2048) — relative path, e.g. "/images/{guid}.jpg"
Category     DishCategory enum (stored as int)
Status       DishStatus enum (stored as string, max 20)
CreatedAt    DateTime (UTC)
Snapshots    ICollection<DishSnapshot>
```

**Note:** There is no `UpdatedAt` field on `Dish` — updates do not track modification time.

#### `DishCategory` enum
```
MainCourse = 1
Dessert    = 2
Beverage   = 3
```

#### `DishStatus` enum
```
Available  = 1
OutOfStock = 2
```

> **Frontend vs. Backend mismatch:** The frontend sends `"Available"` / `"Unavailable"` / `"Hidden"` as status strings in some UI dropdowns, but the backend only accepts `Available` and `OutOfStock`. The `Hidden` concept doesn't exist in the backend `DishStatus` enum. The frontend `StatusPill` in `TableDish` uses lowercase `"available"`, `"unavailable"`, `"hidden"` strings. Keep this in mind when building status-dependent features.

#### `DishSnapshot`
```
Id           int (PK, identity)
DishId       int (FK → Dishes, CASCADE delete)
Name         string (max 256, required)
Price        int (required)
Description  string? (max 1000)
Category     DishCategory (int)
ImagePath    string? (max 2048)
CreatedAt    DateTime (UTC)
Dish         Dish  — nav property (explicit [ForeignKey("DishId")])
```

**Why snapshots exist:** Price and name at the time of ordering must be immutable. When `CreateAsync` runs, a snapshot is created immediately. When `UpdateAsync` detects a change in `Price`, `Name`, or `Category`, it writes a snapshot of the **old** values before applying the update. Order.API references snapshots by ID; it fetches snapshot data once and denormalizes it into the Order row.

**Shadow FK fix:** The latest migration `20260421055532_FixDishSnapshotShadowFK` removed the spurious `DishId1` column that existed in the initial migration due to EF Core inferring two relationships. This is now fixed.

### 4.2 File Upload

`FileUploadUtil` (implements `IFileUploadUtil`, registered as Scoped):
- Saves files to `wwwroot/images/` using `Guid.NewGuid() + extension`
- Max size: 5 MB
- Accepted: any file (the controller accepts `IFormFile`)
- Returns relative path: `/images/{guid}.ext`
- `DeleteFile(relativePath)` removes the file from `wwwroot`
- `CreateAsync` uses `[FromForm]` / `[Consumes("multipart/form-data")]`
- `UpdateAsync` uses `[FromBody]` JSON — image is passed as an existing URL string or `null` (file re-upload on update is not supported via the update endpoint)

### 4.3 API Endpoints

#### `MenuController` (`/menu/dishes`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/menu/dishes` | Anonymous | List all dishes (paginated). Query: `?page=1&pageSize=20` |
| GET | `/menu/dishes/{id}` | Anonymous | Get single dish |
| POST | `/menu/dishes` | SuperAdmin, Admin | Create dish — `multipart/form-data` |
| PUT | `/menu/dishes/{id}` | SuperAdmin, Admin | Update dish — JSON body |
| PATCH | `/menu/dishes/{id}/status` | SuperAdmin, Admin | Update status only — `{ status: "Available" }` |
| DELETE | `/menu/dishes/{id}` | SuperAdmin, Admin | Delete dish + delete image file |

**Create request fields (form-data):**
```
name        string (required, trimmed)
price       decimal (required, > 0, cast to int in service)
description string (required)
category    DishCategory string or int (e.g., "MainCourse")
image       IFormFile? (optional)
```
Backend hardcodes `Status = Available` on create — frontend `status` field in the create form is ignored by the backend.

**Update request body (JSON):**
```json
{
  "name": "...",
  "description": "...",
  "imagePath": "/images/existing.jpg",
  "price": 75000,
  "category": "MainCourse"
}
```

**List response:**
```json
{
  "message": "...",
  "data": {
    "data": [ DishDto, ... ],
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

**`DishDto` shape:**
```json
{
  "id": 1,
  "name": "Phở Bò Đặc Biệt",
  "description": "...",
  "imagePath": "/images/abc123.jpg",
  "category": "MainCourse",
  "price": 185000,
  "status": "Available",
  "createdAt": "2026-04-19T16:39:31Z"
}
```

#### `DishSnapshotController` (`/dish-snapshot`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dish-snapshot/{id}` | Anonymous | Get snapshot by ID — used by Order.API (service-to-service) |
| GET | `/dish-snapshot/by-dish/{dishId}` | Anonymous | Get the **latest** snapshot for a given dish — used by frontend before placing guest order |

**Snapshot response:**
```json
{
  "message": "...",
  "data": {
    "id": 12,
    "name": "Phở Bò",
    "price": 65000,
    "description": "...",
    "category": "MainCourse",
    "imagePath": "/images/xyz.jpg",
    "dishId": 5,
    "createdAt": "..."
  }
}
```

---

## 5. Order.API — Table, Guest & Order Service

**Base URL:** `http://localhost:5219/api/v1`

### 5.1 Domain Entities

#### `Table`
```
Id                     int (PK, identity)
Number                 int (required, unique index)
Capacity               int (required)
Status                 TableStatus enum (stored as string, max 20)
IsVisibleOnReservation bool (default true)
SessionId              Guid (required) — rotated on Reset; invalidates old guest JWTs
CreatedAt              DateTime (UTC)
UpdatedAt              DateTime (UTC)
Guests                 ICollection<Guest>
Orders                 ICollection<Order>
```

#### `TableStatus` enum
```
Available = 1   (QR scannable, no guests currently)
Occupied  = 2   (QR scannable, guests currently present)
Hidden    = 3   (QR not scannable, not visible to guests)
```

#### `Guest`
```
Id          int (PK, identity)
Name        string (max 256, required, trimmed)
TableId     int (FK → Tables, RESTRICT delete — preserves history)
CreatedAt   DateTime (UTC)
Table       Table  — nav property
Orders      ICollection<Order>
```

**Note:** Guests are never deleted — `OnDelete(DeleteBehavior.Restrict)` on both Guest→Table and Order→Guest foreign keys ensures all historical data is preserved.

#### `Order`
```
Id              int (PK, identity)
GuestId         int (FK → Guests, RESTRICT)
TableId         int (FK → Tables, RESTRICT)
DishSnapshotId  int (reference to Menu.API snapshot — no FK, cross-service)
AccountId       int? (nullable — staff member who handled the order)
Quantity        int (required, > 0)
Status          OrderStatus enum (stored as string, max 20)
DishName        string (denormalized at creation from snapshot)
DishPrice       decimal (denormalized at creation from snapshot)
DishImage       string? (denormalized at creation from snapshot)
CreatedAt       DateTime (UTC)
UpdatedAt       DateTime (UTC)
Guest           Guest  — nav property
Table           Table  — nav property
```

Indexes on `TableId`, `GuestId`, `Status`.

#### `OrderStatus` enum
```
Pending    = 1
Preparing  = 2
Served     = 3
Cancelled  = 4
```

### 5.2 Guest Authentication (Dual JWT Scheme)

Order.API handles two distinct user types simultaneously using a **policy-based multi-scheme JWT** setup:

**Scheme routing logic** (`PolicyScheme "MultiJwt"`):
1. Extract `Authorization: Bearer <token>` header
2. Parse (do not validate) the JWT with `JwtSecurityTokenHandler`
3. Read `tokenType` claim:
   - `"GuestAccess"` → forward to `"GuestJwt"` scheme (validated with `GuestJwt:AccessTokenSecret`)
   - Anything else → forward to `"StaffJwt"` scheme (validated with `Jwt:AccessTokenSecret`)

**Guest JWT Claims:**
```
guestId    int
tableId    int
sessionId  Guid  — snapshot of Table.SessionId at login time
role       "Guest"
tokenType  "GuestAccess"
jti        Guid
```

**Staff JWT Claims (issued by Identity.API):**
```
userId     int
role       "SuperAdmin" | "Admin" | "Staff"
email      string
tokenType  "AccessToken"
jti        Guid
```

`JwtSecurityTokenHandler.DefaultMapInboundClaims = false` is set in Order.API `Program.cs` to preserve custom claim names without URI mapping.

### 5.3 Guest Login Flow

`POST /guest/login { tableNumber, name }`:
1. Finds table by `Number` — throws 404 if not found
2. Checks `table.Status == Available` — throws 422 if not
3. Creates `Guest` record (`Name`, `TableId`)
4. Sets `table.Status = Occupied`
5. Saves to DB
6. Issues `accessToken` and `refreshToken` containing `guestId`, `tableId`, `sessionId = table.SessionId`
7. Returns `{ guest: GuestDto, accessToken, refreshToken }`

`POST /guest/refresh-token { refreshToken }`:
1. Validates refresh token signature + expiry
2. Reads `guestId` and `sessionId` from token claims
3. Loads `Guest` with `Table`
4. Compares `guest.Table.SessionId` with token's `sessionId` — if mismatch (table was reset), throws 401
5. Issues new token pair

### 5.4 Table Reset (Session Invalidation)

`PATCH /table/{id}/reset`:
- Sets `table.SessionId = Guid.NewGuid()` — this immediately invalidates ALL existing guest tokens for this table
- Sets `table.Status = Hidden`
- Does NOT delete Guest records (preserves order history)

This is how guests are "logged out" without storing token blocklists — any token with the old `sessionId` will fail the `sessionId` check on the next order attempt.

### 5.5 API Endpoints

#### `GuestController` (`/guest`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/guest/login` | Anonymous | `{ tableNumber, name }` → GuestLoginResponse |
| POST | `/guest/refresh-token` | Anonymous | `{ refreshToken }` → GuestLoginResponse |

#### `TableController` (`/table`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/table` | SuperAdmin, Admin, Staff | Paginated list. Query: `?page=1&pageSize=50` |
| GET | `/table/{id}` | SuperAdmin, Admin, Staff | Get by ID |
| POST | `/table` | SuperAdmin, Admin, Staff | Create `{ number, capacity }` |
| PATCH | `/table/{id}/status` | SuperAdmin, Admin, Staff | Update status `{ status: "Available" }` |
| PATCH | `/table/{id}/reset` | SuperAdmin, Admin, Staff | Rotate SessionId → Hidden |
| DELETE | `/table/{id}` | SuperAdmin, Admin, Staff | Delete table |
| GET | `/table/{id}/public` | Anonymous | Returns `{ id, number, status }` — used by guest welcome page before login |

**`TableDto` shape:**
```json
{
  "id": 1,
  "number": 5,
  "capacity": 4,
  "status": "Available",
  "isVisibleOnReservation": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### `OrderController` (`/order`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/order` | SuperAdmin, Admin, Staff | Paginated. Query: `?page=1&pageSize=20` |
| GET | `/order/my-orders` | Guest | Orders for the currently authenticated guest |
| POST | `/order` | Guest, Staff, Admin, SuperAdmin | Create order (role-branched logic) |
| PATCH | `/order/{id}/status` | SuperAdmin, Admin, Staff | `{ status, accountId? }` |

**`POST /order` role branching:**

*Guest path:*
- Extracts `guestId` and `sessionId` from JWT claims
- Loads Guest + Table, validates `table.SessionId == token.sessionId`
- `TableId` is derived from guest record — cannot be spoofed
- Body: `{ dishSnapshotId, quantity }` (tableId not needed)

*Staff/Admin path:*
- Must provide `tableId` in request body
- Table must be `Occupied`
- Auto-selects the **most recently created** Guest at that table as the order owner
- Body: `{ tableId, dishSnapshotId, quantity }`

In both cases:
1. Calls `MenuApiClient.GetSnapshotAsync(dishSnapshotId)` → `GET http://localhost:3002/api/v1/dish-snapshot/{id}`
2. Denormalizes `DishName`, `DishPrice`, `DishImage` into the Order row
3. Sets `Status = Pending`

**`OrderDto` shape:**
```json
{
  "id": 42,
  "guestId": 7,
  "guestName": "Nguyen Van A",
  "tableId": 3,
  "tableNumber": 5,
  "dishSnapshotId": 12,
  "dishName": "Phở Bò",
  "dishPrice": 65000,
  "dishImage": "/images/xyz.jpg",
  "accountId": null,
  "quantity": 2,
  "status": "Pending",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 5.6 Inter-Service Communication: MenuApiClient

Order.API calls Menu.API synchronously via typed `HttpClient`:
- `GetSnapshotAsync(dishSnapshotId)` → `GET {MenuApi:BaseUrl}/api/v1/dish-snapshot/{id}`
- If snapshot not found → 404 → `KeyNotFoundException`
- Returns `DishSnapshotResponse { Id, Name, Price, ImagePath }`

Base URL configured at `MenuApi:BaseUrl` in `appsettings.json` (default: `http://localhost:3002`).

---

## 6. Reservation.API — Scaffold Only

Exists as a project with only the entity model defined. No controllers, no DB context, no auth wired. `Program.cs` is unmodified boilerplate.

**Planned `Reservation` entity (MongoDB, not yet wired):**
```
Id               int (BsonId)
GuestName        string
GuestPhone       string
GuestEmail       string?
TableId          int? (cross-service reference — no FK)
NumberOfPeople   int
Status           ReservationStatus { Booked, CheckedIn, Cancelled }
ReservationDate  DateTime
DepositAmount    decimal
DepositStatus    { None, Pending, Paid, Refunded, Forfeited }
Note             string?
AccountId        int? (staff managing reservation)
CreatedAt        DateTime
UpdatedAt        DateTime
```

---

## 7. Frontend Architecture (Next.js)

### 7.1 URL Structure

| Path | Role | Description |
|---|---|---|
| `/` | Public | Landing page — shows featured dishes, stats bar, CTA buttons |
| `/login` | Public | Admin login form |
| `/reservation` | Public | Guest table reservation form (uses localStorage, no backend reservation API yet) |
| `/admin` | Admin/SuperAdmin | Dashboard with metrics and recent orders |
| `/admin/dishes` | Admin/SuperAdmin | Dish management (CRUD) |
| `/admin/accounts` | Admin/SuperAdmin | Staff/Admin account management |
| `/admin/orders` | Admin/SuperAdmin/Staff | Order management with table status grid |
| `/admin/tables` | Admin/SuperAdmin/Staff | Table management with QR codes |
| `/admin/reservations` | Admin/SuperAdmin/Staff | Reservation list (uses localStorage — no backend) |
| `/admin/settings` | Any authenticated | Profile + password change |
| `/table/[tableId]/welcome` | Guest | Table welcome/login page — guest enters their name |
| `/table/[tableId]` | Guest | Guest menu page — browse and order |
| `/table/[tableId]/orders` | Guest | Guest order status page |

### 7.2 Authentication (Frontend)

**Admin tokens** are stored in `localStorage`:
- `accessToken` — admin JWT from Identity.API
- `refreshToken` — admin refresh token

**Guest tokens** are stored in `sessionStorage` (tab-scoped, cleared on tab close):
- `guestAccessToken`
- `guestRefreshToken`
- `guestName`, `guestTableNumber`

**Token attach:** `http.ts` reads the admin `accessToken` from localStorage and attaches `Authorization: Bearer <token>` for all direct backend calls (when `baseUrl !== ''`). Guest pages attach their own token manually via `headers: { Authorization: 'Bearer <guestToken>' }`.

**Next.js middleware** (`src/middleware.ts`):
- Reads `accessToken` and `refreshToken` cookies (set by `/api/auth/login` route handler)
- Redirects unauthenticated users from `/admin/*` to `/login`
- Redirects already-authenticated users from `/login` to `/admin`
- Checks `role` claim from decoded access token — only `Admin` and `SuperAdmin` can access `/admin/*`

**Next.js Route Handlers** (BFF pattern):
- `POST /api/auth/login` — proxies to Identity.API, sets `accessToken` and `refreshToken` as `httpOnly` cookies
- `POST /api/auth/logout` — reads cookies, calls Identity.API logout, clears cookies

### 7.3 HTTP Client (`src/lib/http.ts`)

Custom wrapper around `fetch` that:
- Resolves base URL based on `service` option (`'identity'` → port 3001, `'menu'` → port 3002, `'order'` → port 5219)
- Auto-attaches admin `Authorization` header from localStorage (only for direct backend calls)
- Handles `FormData` by omitting `Content-Type` header (lets browser set multipart boundary)
- Throws `HttpError(status, payload)` for non-2xx responses
- Throws `EntityError` for 422 (validation errors with field-level detail)
- Calls `handleUnauthorized()` on 401

**`handleUnauthorized()` in `auth.service.ts`:**
- On guest routes (`/table/*`): tries guest token refresh → if success, reload; if fail, clear session + redirect to welcome page
- On admin routes: calls `/api/auth/logout`, clears localStorage, redirects to `/login`

### 7.4 TanStack Query Layer

**Query keys:**
```
['dishes']                           — all dishes
['dishes', id]                       — single dish
['account']                          — all accounts
['account', id]                      — single account
['account', 'me']                    — current user profile
['orders', page, pageSize]           — paginated orders
['orders']                           — invalidation key for all order queries
['tables', page, pageSize]           — paginated tables
['tables']                           — invalidation key for all table queries
['guest-orders', tableId]            — guest's own orders
['table-public', tableId]            — public table info (for welcome page)
```

**Global config:**
```typescript
refetchOnWindowFocus: false
refetchOnMount: true
```

**Polling:** Orders and guest orders refetch every 15 seconds (`refetchInterval: 15_000`) to show live kitchen updates without WebSockets.

### 7.5 Zod Schemas (`src/schema/`)

All request bodies and API responses have Zod schemas for type safety and runtime validation:

- `auth.schema.ts` — `LoginBodySchema`, `LoginResponse`, `RefreshTokenBody/Res`, `LogoutBody`
- `account.schema.ts` — `AccountSchema`, `AccountListRes`, `AccountRes`, `CreateStaffBody`, `UpdateEmployeeBody`, `UpdateProfileBody`, `ChangePasswordBody`
- `dish.schema.ts` — `CreateDishBody`, `UpdateDishBody`, `DishSchema`, `DishRes`, `DishListRes`
- `order.schema.ts` — `OrderListRes`, `OrderRes`, `UpdateOrderStatusBody`, `CreateOrderBodySchema`
- `table.schema.ts` — `tableSchema`, `tableListSchema`, `createTableBodySchema`, `updateTableStatusBodySchema`
- `guest.schema.ts` — `GuestLoginBodySchema`, `GuestLoginResponseSchema`, `GuestOrderDtoSchema`, `GuestOrderListResponseSchema`

### 7.6 Admin UI Pages — Key Features

**Dashboard (`/admin`):**
- Metrics: revenue (served orders), total orders, occupied tables, avg order value
- Revenue Chart (bar chart by month) and Top Dishes chart (horizontal bar) — currently using hardcoded sample data (commented-out live aggregation code exists)
- Recent 5 orders table

**Dishes (`/admin/dishes`):**
- Table with image, name, category, price, status
- Add dialog: `multipart/form-data` with `ImageUpload` component (drag-and-drop, PNG/JPG, max 5MB)
- Edit/Delete buttons in table rows (edit dialog and delete mutation are present in hooks but `TableDish` component does not yet wire them to the action buttons — they are `onClick`-less)

**Accounts (`/admin/accounts`):**
- Table with avatar (initials-based), name, email, role pill, joined date
- Search by name or email (client-side filter)
- Edit dialog (`EditEmployee`) — updates name, email, avatar
- Delete dialog (`DeleteAccountDialog`) — with confirmation
- Add Staff dialog (`AddStaff`) — creates new staff with password

**Orders (`/admin/orders`):**
- `TableStatusGrid` — visual grid of all tables showing occupied/empty/hidden status with active order count badges. Clicking a table opens Create Order modal pre-selected to that table.
- Orders table with date range filter, status filter, view modal, edit modal (status update + cancel with confirmation)
- Create Order modal: select table + dish + quantity → calls staff create order endpoint

**Tables (`/admin/tables`):**
- Table list with QR code preview (`qrcode.react`), status pill, number
- Add Table modal
- Edit Table modal — shows full-size QR, reset button, status selector
- Delete confirmation dialog

**Settings (`/admin/settings`):**
- Profile card — update name (avatar upload is UI-only, no backend file upload)
- Security card — change password form. On success, calls logout and redirects to login (because backend revokes all refresh tokens)

### 7.7 Guest UI Pages — Key Features

**Welcome page (`/table/[tableId]/welcome`):**
- Calls `GET /table/{id}/public` (anonymous) to get table number and status
- If `status == "Hidden"` — shows "table unavailable" message
- Guest enters name → calls `POST /guest/login { tableNumber, name }`
- Saves tokens to `sessionStorage`, redirects to menu page

**Menu page (`/table/[tableId]`):**
- Guards: redirects to welcome if not logged in
- Fetches dishes via `useGetDishes()` (same hook as admin)
- Category filter tabs (All, Main Course, Dessert, Beverage)
- Add/remove items to cart (local state only)
- Order bar at bottom when cart has items
- On submit: for each cart item, calls `GET /dish-snapshot/by-dish/{dishId}` to get latest snapshotId, then `POST /order { dishSnapshotId, quantity }` with guest token. Requests are parallel via `Promise.all`.
- On 401: redirects to welcome page

**Orders page (`/table/[tableId]/orders`):**
- Lists all orders for current guest (polls every 15s)
- Shows dish image, name, quantity, time, status pill
- Total amount at bottom (excludes cancelled)
- Manual refresh button

### 7.8 Design System

The entire UI uses a custom dark gold theme defined in `globals.css`:
```
Background: #0D0B08 (warm black)
Surface:    #1A1714
Card:       #221F1A
Primary:    #FFC000 (gold)
Foreground: #F5F0E8 (warm white)
Muted:      #8A7F72 (warm gray)
Destructive: #FF3B30
```

---

## 8. Cross-Cutting Concerns

### 8.1 GlobalExceptionMiddleware (all 3 active services — identical)

| Exception | HTTP Status |
|---|---|
| `UnauthorizedAccessException` | 401 |
| `KeyNotFoundException` | 404 |
| `ArgumentException` | 422 |
| Any other | 500 (logged via `ILogger.LogError`) |

Response: `{ "message": "...", "statusCode": 422 }` (camelCase via `JsonNamingPolicy.CamelCase`).

### 8.2 Shared JWT Architecture

`Jwt:AccessTokenSecret` is **identical** across Identity.API, Menu.API, and Order.API. This allows tokens issued by Identity.API to be validated by downstream services without an API gateway or token introspection endpoint — a deliberate simplification.

`JwtSecurityTokenHandler.DefaultMapInboundClaims = false` is set in Order.API `Program.cs` to prevent .NET from remapping `role` → `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`. Menu.API does **not** set this flag, which may cause authorization failures if role claims are not mapped correctly.

### 8.3 CORS

All services: `AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()` — development only. Must be restricted before production deployment.

### 8.4 DB Migration & Seeding at Startup

All SQL services call `db.Database.Migrate()` in a scoped block at startup. Identity.API additionally seeds a SuperAdmin if `Accounts` table is empty.

### 8.5 Pagination (`Shared` project)

`PaginationParams` (from `Shared.csproj` BuildingBlocks):
```csharp
int Page     // 1-based
int PageSize
int Skip => (Page - 1) * PageSize
int Take => PageSize
```

`PaginatedResponse<T>`:
```json
{ "data": [...], "total": 42, "page": 1, "pageSize": 20, "totalPages": 3 }
```

---

## 9. Data Flow: Guest Places an Order (Complete Happy Path)

```
1. Admin creates table
   POST /api/v1/table { number: 5, capacity: 4, isVisibleOnReservation: true }
   → Table { Id=3, Number=5, SessionId=abc-111, Status=Available }

2. Admin creates dishes
   POST /api/v1/menu/dishes (multipart/form-data)
   → Dish { Id=7, Name="Phở Bò", Price=65000, Status=Available }
   → DishSnapshot { Id=12, DishId=7, Name="Phở Bò", Price=65000 } created automatically

3. QR code printed for table 5
   QR encodes URL: https://vietgold.com/table/3/welcome (tableId=3 is the DB id)

4. Guest scans QR → opens welcome page
   Frontend: GET /api/v1/table/3/public → { id:3, number:5, status:"Available" }
   Guest enters name "Nguyen Van A"
   POST /api/v1/guest/login { tableNumber: 5, name: "Nguyen Van A" }
   → Guest { Id=42 } created, Table.Status → Occupied
   → Response: { guest, accessToken (guestId=42, sessionId=abc-111, role=Guest), refreshToken }
   → Frontend saves tokens to sessionStorage

5. Guest browses menu
   GET /api/v1/menu/dishes (anonymous)
   → List of Available dishes

6. Guest adds "Phở Bò" x2 to cart, taps order button
   Frontend: GET /api/v1/dish-snapshot/by-dish/7 → snapshotId=12
   POST /api/v1/order { dishSnapshotId: 12, quantity: 2 }
   Authorization: Bearer <guestAccessToken>
   → Order.API validates GuestJwt → extracts guestId=42, sessionId=abc-111
   → Loads Guest(42) → Table(3) → checks Table.SessionId == abc-111 ✓
   → Calls Menu.API: GET /api/v1/dish-snapshot/12 → { name:"Phở Bò", price:65000 }
   → Creates Order { GuestId=42, TableId=3, DishSnapshotId=12,
       DishName="Phở Bò", DishPrice=65000, Quantity=2, Status=Pending }

7. Staff sees order on orders page
   GET /api/v1/order → order appears with Status=Pending
   PATCH /api/v1/order/{id}/status { status: "Preparing", accountId: 2 }
   PATCH /api/v1/order/{id}/status { status: "Served", accountId: 2 }

8. Guest checks their orders
   GET /api/v1/order/my-orders (with guestAccessToken)
   → Shows Phở Bò x2, Status=Served

9. Guest leaves — staff clicks "Reset" on table
   PATCH /api/v1/table/3/reset
   → Table.SessionId = xyz-222 (new Guid), Table.Status = Hidden

10. If guest tries to order again with old token:
    POST /api/v1/order { dishSnapshotId: 12, quantity: 1 }
    → Table.SessionId (xyz-222) != token.sessionId (abc-111)
    → 401 "Phiên đã hết hạn, vui lòng quét QR lại"
    → Frontend redirects to /table/3/welcome
```

---

## 10. Configuration Reference

### Identity.API required `appsettings.json` keys
```json
{
  "ConnectionStrings": { "IdentityDb": "Server=...;Database=Identity;..." },
  "Jwt": {
    "AccessTokenSecret": "<min 32 chars>",
    "RefreshTokenSecret": "<min 32 chars, different from access>",
    "Issuer": "RestaurantQR",
    "Audience": "RestaurantQR",
    "AccessTokenExpiresInMinutes": 15,
    "RefreshTokenExpiresInDays": 7
  }
}
```

### Menu.API required keys
```json
{
  "ConnectionStrings": { "MenuDb": "Server=...;Database=Menu;..." },
  "Jwt": {
    "AccessTokenSecret": "<same as Identity.API>",
    "Issuer": "RestaurantQR",
    "Audience": "RestaurantQR"
  }
}
```

### Order.API required keys
```json
{
  "ConnectionStrings": { "OrderDb": "Server=...;Database=Order;..." },
  "Jwt": {
    "AccessTokenSecret": "<same as Identity.API>",
    "Issuer": "RestaurantQR",
    "Audience": "RestaurantQR"
  },
  "GuestJwt": {
    "AccessTokenSecret": "<unique guest access secret>",
    "RefreshTokenSecret": "<unique guest refresh secret>",
    "Issuer": "RestaurantQR",
    "Audience": "RestaurantQR",
    "AccessTokenExpiresInMinutes": 60,
    "RefreshTokenExpiresInDays": 1
  },
  "MenuApi": { "BaseUrl": "http://localhost:3002" }
}
```

### Frontend `.env.local` required keys
```
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_API_IDENTITY=http://localhost:3001/api/v1
NEXT_PUBLIC_API_MENU=http://localhost:3002/api/v1
NEXT_PUBLIC_API_ORDER=http://localhost:5219/api/v1
```

---

## 11. Known Issues & Incomplete Features

| # | Issue | Location | Notes |
|---|---|---|---|
| 1 | Revenue and Top Dishes charts use hardcoded sample data | `revenue-chart.tsx`, `top-dishes-chart.tsx` | Live aggregation code exists but is commented out |
| 2 | Edit/Delete buttons in `TableDish` are not wired to mutations | `table_dish.tsx` | Buttons render but have no `onClick` handler — mutations exist in `useDish.ts` but not connected |
| 3 | `DishCategory` stored as `int`, `DishStatus` stored as `string` in Menu.API | `DishConfiguration.cs` | Inconsistent; `string` preferred for readability |
| 4 | Menu.API does not set `DefaultMapInboundClaims = false` | `Menu.API/Program.cs` | May cause role claim mapping issues under some .NET versions |
| 5 | `Reservation.API` not wired | All | Frontend reservations page uses `localStorage` instead of the backend service |
| 6 | No `UpdatedAt` field on `Dish` entity | Menu.API | Updates have no modification timestamp |
| 7 | Open CORS policy | All backends | Must be restricted to frontend origin before production |
| 8 | Secrets in `appsettings.json` | All | Should use .NET Secret Manager or environment variables |
| 9 | Admin header search bar is decorative | `admin-header.tsx` | Input renders but has no search logic wired |
| 10 | Pagination in Accounts and Tables pages fetches fixed page/pageSize | `accounts/page.tsx`, `tables/page.tsx` | `onPageChange` callback exists but does not update query params |
