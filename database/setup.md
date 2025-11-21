# Database Setup Guide

## Quick Start with Docker

1. **Start PostgreSQL container:**
   ```bash
   cd database
   docker-compose up -d
   ```

2. **Wait for database to be ready** (about 10-20 seconds)

3. **Create the schema:**
   ```bash
   # Option 1: Using psql (if installed)
   psql -h localhost -U recipeapp -d recipeapp -f schema.sql
   # Password: recipeapp123

   # Option 2: Using Docker exec
   docker exec -i recipe-app-db psql -U recipeapp -d recipeapp < schema.sql
   ```

4. **Verify it's working:**
   ```bash
   docker exec -it recipe-app-db psql -U recipeapp -d recipeapp -c "\dt"
   ```

## Connection String

Use this in your `.env` file:
```
DATABASE_URL=postgresql://recipeapp:recipeapp123@localhost:5432/recipeapp
```

## Stop Database

```bash
docker-compose down
```

## Reset Database (WARNING: Deletes all data)

```bash
docker-compose down -v
docker-compose up -d
# Then run schema.sql again
```

## Manual PostgreSQL Setup (without Docker)

1. Install PostgreSQL locally
2. Create database:
   ```sql
   CREATE DATABASE recipeapp;
   CREATE USER recipeapp WITH PASSWORD 'recipeapp123';
   GRANT ALL PRIVILEGES ON DATABASE recipeapp TO recipeapp;
   ```
3. Run `schema.sql` file

## Troubleshooting

- **Port 5432 already in use**: Change port in `docker-compose.yml` (e.g., `"5433:5432"`)
- **Connection refused**: Wait a bit longer for container to start
- **Permission denied**: Make sure Docker is running

