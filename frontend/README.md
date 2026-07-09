# Viet Gold — QR Restaurant Ordering System (Frontend)

Viet Gold is a QR-code-based restaurant management system. Guests scan a QR code on their table to open a browser-based ordering menu — no app install required — while staff manage dishes, tables, orders and accounts through a protected admin dashboard.

This repository contains the **Next.js frontend**: the guest-facing ordering experience, the public reservation page, and the admin dashboard. It talks to a set of independent **.NET microservices** through an API gateway.

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Internationalization (i18n)](#internationalization-i18n)
- [Authentication (BFF Pattern)](#authentication-bff-pattern)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Backend Services (context)](#backend-services-context)
- [Known Issues / Roadmap](#known-issues--roadmap)

## Architecture

```
Frontend (this repo)  →  Gateway (.NET YARP)  →  Microservices (Identity, Menu, Order, Reservation)
```

![Architecture diagram](docs/architecture-diagram.png)

- The **Next.js UI** never talks to the backend directly. All requests go through the **Next.js BFF** (App Router Route Handlers under `src/app/api`), which owns authentication.
- The BFF stores the access/refresh tokens as `httpOnly` cookies and attaches them to every outgoing request — the browser never sees a raw token.
- The BFF forwards requests to a **.NET YARP API Gateway**, which routes to the right microservice: **Identity**, **Menu**, **Order**, or **Reservation**.

> Save the diagram image to `docs/architecture-diagram.png` for it to render here.

## Features

### Guest (QR ordering)
- Scan a table's QR code (or use the in-browser scanner) → land on `/table/{tableId}/welcome`
- Enter a name to start a session (no account/password needed)
- Browse the live menu, filter by category, build a cart, and place an order
- Track order status in real time (Pending → Preparing → Served) via SignalR
- Request the bill directly from the order-status page

### Public reservation
- Browse an interactive floor plan and pick a table (or let the restaurant assign one)
- Submit a booking with name, phone, date/time and party size — no login required

### Admin dashboard (Staff / Admin / SuperAdmin)
- **Dashboard** — revenue, order and table metrics, revenue/top-dish charts, recent orders
- **Dishes** — CRUD, image upload, category/status management
- **Orders** — real-time order board grouped by **table + guest**, with per-item and bulk status updates
- **Tables** — CRUD, QR code generation/reset, live status (Available / Occupied / Hidden)
- **Accounts** — role-based staff/admin management (SuperAdmin creates Admins, Admin creates Staff)
- **Reservations** — manage incoming public bookings, check-in / deposit / cancellation flow
- **Settings** — profile and password management

### Cross-cutting
- Full **English / Vietnamese** UI via `next-intl`, with a locale switcher that preserves the current path
- Real-time updates over **SignalR** (new orders, status changes, bill requests)
- Dark, gold-accented design system built with Tailwind CSS v4 + shadcn/ui

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + custom design tokens |
| UI Components | shadcn/ui + Radix UI primitives |
| Data fetching / cache | TanStack Query v5 |
| Forms & validation | React Hook Form + Zod |
| i18n | next-intl |
| Real-time | @microsoft/signalr |
| Charts | Recharts |
| QR codes | qrcode.react, html5-qrcode (scanner) |
| HTTP layer | Custom `src/lib/http.ts` wrapper over `fetch` |
| Notifications | Sonner (toast) |

## Project Structure

```
src/
├── app/
│   ├── [locale]/                 # All user-facing pages, prefixed with /vi or /en
│   │   ├── page.tsx              # Landing page
│   │   ├── login/                # Admin login
│   │   ├── reservation_public/   # Public table reservation
│   │   ├── table/[tableId]/      # Guest flow: welcome → menu → orders
│   │   └── admin/                # Protected admin dashboard
│   │       ├── page.tsx          # Dashboard
│   │       ├── dishes/
│   │       ├── orders/
│   │       ├── tables/
│   │       ├── accounts/
│   │       ├── reservations/
│   │       └── settings/
│   ├── api/                      # BFF route handlers (auth, guest-auth, realtime tokens, proxy)
│   └── layout.tsx                # Root layout (pass-through; real <html> lives in [locale]/layout.tsx)
├── i18n/                         # next-intl routing, navigation, request config
├── components/                   # Shared UI (admin shell, dialogs, charts, shadcn/ui primitives)
├── queries/                      # TanStack Query hooks per domain (dish, order, table, account…)
├── apiRequests/                  # Typed request functions used by the query hooks
├── schema/                       # Zod schemas — request/response validation & types
├── lib/                          # http client, utils, guest session helpers
├── hooks/                        # SignalR hook, token refresh hook, etc.
└── middleware.ts                 # Composes next-intl locale routing with cookie-based auth guarding

messages/
├── en.json                       # English translations
└── vi.json                       # Vietnamese translations
```

## Internationalization (i18n)

The app is fully bilingual (`vi` default, `en`) using [`next-intl`](https://next-intl.dev):

- Every route lives under `src/app/[locale]/...`; the middleware (`src/middleware.ts`) detects/redirects to a locale prefix (`/vi/...`, `/en/...`) **before** running the auth checks, and preserves the locale through every redirect.
- Translation strings live in `messages/vi.json` and `messages/en.json`, namespaced by area (`HomePage`, `LoginPage`, `AdminNav`, `Admin.*`, `Guest.*`).
- Server Components read translations via `getTranslations` (`next-intl/server`); Client Components use the `useTranslations` hook.
- `src/components/language-switcher.tsx` lets users switch locale while staying on the same page.

## Authentication (BFF Pattern)

As shown in the architecture diagram, authentication is entirely owned by the **Backend-for-Frontend** layer:

1. The browser calls a Next.js Route Handler (e.g. `POST /api/auth/login`), never the microservices directly.
2. The Route Handler calls the Identity service through the gateway, receives an access/refresh token pair, and sets them as `httpOnly`, `secure` cookies.
3. `src/middleware.ts` reads those cookies on every request to `/admin/*`: no refresh token → redirect to `/login`; refresh token present but access token expired → silently refresh; valid token → check role before allowing access.
4. Guests get a **separate, short-lived token** (`GuestAccess` type, different secret) issued by `POST /guest/login`, scoped to a single table session (`sessionId`). Resetting a table invalidates every outstanding guest token instantly.

## Getting Started

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env   # if present, otherwise create .env manually — see below

# Run the dev server (http://localhost:4000)
npm run dev

# Production build
npm run build
npm run start
```

## Environment Variables

```bash
# ── Public (bundled into the browser) ──────────────────────────────────────
NEXT_PUBLIC_URL=http://localhost:4000
NEXT_PUBLIC_SIGNALR_ORDER=<gateway-url>            # SignalR hub base URL
NEXT_PUBLIC_MENU_ASSETS_URL=<gateway-url>          # Dish image host
NEXT_PUBLIC_GA_ID=<google-analytics-id>            # optional

# ── Server-only (read by BFF route handlers / middleware) ─────────────────
IDENTITY_API_URL=<gateway-url>/api/v1
MENU_API_URL=<gateway-url>/api/v1
ORDER_API_URL=<gateway-url>/api/v1
RESERVATION_API_URL=<gateway-url>/api/v1
API_GATEWAY_URL=<gateway-url>/api/v1
```

> All backend traffic goes through the same API Gateway; the four `*_API_URL` variables typically point to the same host with different route prefixes handled by the gateway.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server on port 4000 (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

## Backend Services (context)

This frontend is one piece of a larger system. The gateway routes to four independent .NET services:

| Service | Responsibility | Status |
|---|---|---|
| Identity.API | Accounts, JWT auth, roles | Complete |
| Menu.API | Dishes, categories, price snapshots | Complete |
| Order.API | Tables, guests, orders, guest auth | Complete |
| Reservation.API | Table reservations (MongoDB) | Scaffold only — the public reservation page currently persists to the Order service via a `Reservation` resource, see backend docs |

Full domain model, endpoint reference, and cross-service data flow are documented separately for backend contributors.

## Known Issues / Roadmap

- Dashboard revenue/top-dish charts use static sample data — live aggregation is implemented but commented out pending a decision on date-range aggregation strategy.
- Edit/Delete actions on some admin tables (Dishes) are not yet wired to their mutations.
- Client-side order grouping (table + guest) in the Orders admin page is a UI-only grouping; if a guest's items span two pages of server-side pagination, the group will appear split. A backend "check/ticket" concept would resolve this permanently.
- CORS is fully open across all backend services — must be restricted before production deployment.
- Guest-facing pages that are not yet fully covered by translations: individual dish add/edit dialogs in the admin Dishes page (mostly already in English).
