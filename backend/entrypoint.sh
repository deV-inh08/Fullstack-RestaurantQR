#!/bin/sh
set -e

echo "=== [RestaurantQR] Starting Heroku All-in-One Container ==="

# Force Workstation GC to minimize RAM usage in 512MB dyno
export DOTNET_gcServer=0
export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Production}"

# Convert Heroku DATABASE_URL (postgres://user:pass@host:port/dbname)
# to Npgsql connection string format if present
if [ -n "$DATABASE_URL" ]; then
    echo "Found DATABASE_URL, parsing for Npgsql..."
    URL_WITHOUT_PROTO="${DATABASE_URL#*://}"
    USER_PASS="${URL_WITHOUT_PROTO%%@*}"
    HOST_PORT_DB="${URL_WITHOUT_PROTO#*@}"

    DB_USER="${USER_PASS%%:*}"
    DB_PASS="${USER_PASS#*:}"

    HOST_PORT="${HOST_PORT_DB%%/*}"
    DB_NAME="${HOST_PORT_DB#*/}"
    DB_NAME="${DB_NAME%%\?*}"

    DB_HOST="${HOST_PORT%%:*}"
    DB_PORT="${HOST_PORT#*:}"
    [ "$DB_PORT" = "$DB_HOST" ] && DB_PORT=5432

    NPGSQL_CONN="Host=${DB_HOST};Port=${DB_PORT};Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASS};SSL Mode=Require;Trust Server Certificate=true"

    export ConnectionStrings__IdentityDb="${ConnectionStrings__IdentityDb:-$NPGSQL_CONN}"
    export ConnectionStrings__MenuDb="${ConnectionStrings__MenuDb:-$NPGSQL_CONN}"
    export ConnectionStrings__OrderDb="${ConnectionStrings__OrderDb:-$NPGSQL_CONN}"
fi

# Configure internal routing for Gateway & inter-service calls
export ReverseProxy__Clusters__identity__Destinations__default__Address="http://127.0.0.1:3001"
export ReverseProxy__Clusters__menu__Destinations__default__Address="http://127.0.0.1:3002"
export ReverseProxy__Clusters__order__Destinations__default__Address="http://127.0.0.1:5219"
export ReverseProxy__Clusters__reservation__Destinations__default__Address="http://127.0.0.1:3004"
export MenuApi__BaseUrl="http://127.0.0.1:3002"

# Trap signals for graceful shutdown
cleanup() {
    echo "Received termination signal, stopping all services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup TERM INT

# 1. Start Identity.API
echo "Starting Identity.API on 127.0.0.1:3001..."
ASPNETCORE_URLS="http://127.0.0.1:3001" dotnet /app/identity/Identity.API.dll &

# 2. Start Menu.API
echo "Starting Menu.API on 127.0.0.1:3002..."
ASPNETCORE_URLS="http://127.0.0.1:3002" dotnet /app/menu/Menu.API.dll &

# 3. Start Order.API
echo "Starting Order.API on 127.0.0.1:5219..."
ASPNETCORE_URLS="http://127.0.0.1:5219" dotnet /app/order/Order.API.dll &

# 4. Start Reservation.API
echo "Starting Reservation.API on 127.0.0.1:3004..."
ASPNETCORE_URLS="http://127.0.0.1:3004" dotnet /app/reservation/Reservation.API.dll &

# Wait briefly for internal services to spin up
sleep 4

# 5. Start Gateway.API (Frontend entry point on Heroku assigned $PORT)
PORT="${PORT:-8080}"
echo "Starting Gateway.API on port $PORT..."
ASPNETCORE_URLS="http://0.0.0.0:${PORT}" exec dotnet /app/gateway/Gateway.API.dll