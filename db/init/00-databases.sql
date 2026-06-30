-- Runs once, on first initialization of an empty pg_data volume
-- (postgres entrypoint executes every *.sql in /docker-entrypoint-initdb.d).
-- The base image only auto-creates a database named after POSTGRES_USER, so we
-- create the application and n8n databases explicitly here.
CREATE DATABASE autohq;
CREATE DATABASE autohq_n8n;
