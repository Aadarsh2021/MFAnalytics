# Quick Setup Guide

## Prerequisites

- Docker Desktop installed and running
- Git (optional, for version control)

## Quick Start (Docker - Recommended)

1. **Navigate to project directory:**

```bash
cd C:\Users\thaku\Desktop\Work\Mf
```

2. **Create environment file:**

```bash
# Copy example env file
copy backend\.env.example backend\.env

# Edit backend\.env and set your SECRET_KEY
# You can generate one with: python -c "import secrets; print(secrets.token_urlsafe(32))"
```

3. **Start all services:**

```bash
docker-compose up -d
```

4. **Check service status:**

```bash
docker-compose ps
```

5. **View logs:**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

6. **Access the application:**

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:8000>
- API Documentation: <http://localhost:8000/api/docs>
- PostgreSQL: localhost:5432 (user: portfolio_user, password: portfolio_password)
- Redis: localhost:6379

## Local Development Setup (Without Docker)

### Backend Setup

1. **Create virtual environment:**

```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

2. **Install dependencies:**

```bash
pip install -r requirements.txt
```

3. **Set up environment:**

```bash
copy .env.example .env
# Edit .env with your settings
```

4. **Start PostgreSQL and Redis:**

```bash
# Using Docker for just database and cache
docker-compose up -d postgres redis
```

5. **Run backend:**

```bash
python main.py
# Or: uvicorn main:app --reload
```

### Frontend Setup

1. **Install dependencies:**

```bash
cd frontend
npm install
```

2. **Create environment file:**

```bash
copy .env.local.example .env.local
```

3. **Run development server:**

```bash
npm run dev
```

## Testing the Application

### 1. Test Backend API

Visit <http://localhost:8000/api/docs> to see interactive API documentation.

Try the health check:

```bash
curl http://localhost:8000/api/health
```

### 2. Test Client Intake Flow

1. Open <http://localhost:3000>
2. Click "Create New Portfolio"
3. Fill in the risk profile form
4. Select a risk profile preset (Conservative/Moderate/Aggressive)
5. Adjust sliders as needed
6. Click "Continue to Fund Selection"

### 3. Test API Endpoints

**Save intake:**

```bash
curl -X POST http://localhost:8000/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test Client",
    "risk_profile": {
      "risk_level": "Moderate",
      "investment_horizon": 5,
      "asset_allocation": {
        "equity_min": 40,
        "equity_max": 70,
        "debt_min": 20,
        "debt_max": 50,
        "gold_min": 0,
        "gold_max": 10,
        "alt_min": 0,
        "alt_max": 10
      },
      "volatility_tolerance": 15,
      "return_expectation": 12,
      "max_weight_per_fund": 20,
      "min_weight_per_fund": 0
    }
  }'
```

**Retrieve intake:**

```bash
curl http://localhost:8000/api/intake/1
```

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

## Troubleshooting

### Port Already in Use

If ports 3000, 8000, 5432, or 6379 are already in use:

1. Stop the conflicting service
2. Or modify ports in `docker-compose.yml`

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Frontend Build Errors

```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run dev
```

### Backend Import Errors

```bash
# Reinstall dependencies
cd backend
pip install -r requirements.txt --force-reinstall
```

## Next Steps

Now that MODULE 1 (Client Intake) is complete, you can:

1. Implement MODULE 2 (Fund Selection)
2. Add sample fund data to the database
3. Build the optimization engine
4. Create the dashboard visualization

## Development Workflow

1. Make changes to code
2. Changes auto-reload (hot reload enabled)
3. Test in browser/API docs
4. Commit changes to git

## Useful Commands

```bash
# View all containers
docker ps -a

# Execute command in container
docker-compose exec backend python
docker-compose exec postgres psql -U portfolio_user -d portfolio_optimizer

# View container resource usage
docker stats

# Rebuild containers after dependency changes
docker-compose up -d --build
```
