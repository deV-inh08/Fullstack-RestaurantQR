# Multi-stage Dockerfile for Heroku All-in-One Container
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# 1. Copy project files for layer caching
COPY ["backend/BuildingBlocks/Shared.csproj", "BuildingBlocks/"]
COPY ["backend/Gateway.API/Gateway.API.csproj", "Gateway.API/"]
COPY ["backend/src/Services/Identity.API/Identity.API.csproj", "src/Services/Identity.API/"]
COPY ["backend/src/Services/Menu.API/Menu.API.csproj", "src/Services/Menu.API/"]
COPY ["backend/src/Services/Order.API/Order.API.csproj", "src/Services/Order.API/"]
COPY ["backend/src/Services/Reservation.API/Reservation.API.csproj", "src/Services/Reservation.API/"]

# 2. Restore NuGet dependencies
RUN dotnet restore "Gateway.API/Gateway.API.csproj" && \
    dotnet restore "src/Services/Identity.API/Identity.API.csproj" && \
    dotnet restore "src/Services/Menu.API/Menu.API.csproj" && \
    dotnet restore "src/Services/Order.API/Order.API.csproj" && \
    dotnet restore "src/Services/Reservation.API/Reservation.API.csproj"

# 3. Copy entire backend source
COPY backend/ .

# 4. Build and publish each service
RUN dotnet publish "src/Services/Identity.API/Identity.API.csproj" -c Release -o /app/identity /p:UseAppHost=false
RUN dotnet publish "src/Services/Menu.API/Menu.API.csproj" -c Release -o /app/menu /p:UseAppHost=false
RUN dotnet publish "src/Services/Order.API/Order.API.csproj" -c Release -o /app/order /p:UseAppHost=false
RUN dotnet publish "src/Services/Reservation.API/Reservation.API.csproj" -c Release -o /app/reservation /p:UseAppHost=false
RUN dotnet publish "Gateway.API/Gateway.API.csproj" -c Release -o /app/gateway /p:UseAppHost=false

# 5. Final Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Ensure curl / ca-certificates are present for health probes
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy published binaries
COPY --from=build /app/identity /app/identity
COPY --from=build /app/menu /app/menu
COPY --from=build /app/order /app/order
COPY --from=build /app/reservation /app/reservation
COPY --from=build /app/gateway /app/gateway

# Setup directories and entrypoint
RUN mkdir -p /app/menu/wwwroot/images
COPY backend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Heroku will expose the port defined in $PORT
ENTRYPOINT ["/app/entrypoint.sh"]