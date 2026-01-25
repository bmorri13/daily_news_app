#!/bin/bash
set -e

# Create postgres role with password from environment variable
psql -v ON_ERROR_STOP=1 --username "supabase_admin" --dbname "postgres" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres') THEN
            CREATE ROLE postgres WITH LOGIN SUPERUSER CREATEDB CREATEROLE;
        END IF;
    END
    \$\$;

    ALTER ROLE postgres WITH PASSWORD '${POSTGRES_PASSWORD}';
EOSQL

echo "postgres role created and password set"
