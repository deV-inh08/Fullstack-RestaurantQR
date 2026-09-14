#!/bin/bash
set -e

# ─── Tạo 3 databases cho RestaurantQR microservices ────────────────────────────
# Script này chạy tự động trong docker-entrypoint-initdb.d/ khi PostgreSQL
# khởi động lần đầu tiên (chỉ chạy 1 lần, khi volume chưa tồn tại).

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE "IdentityDb";
    CREATE DATABASE "MenuDb";
    CREATE DATABASE "OrderDb";
EOSQL

echo "Databases IdentityDb, MenuDb, OrderDb created successfully."
