# Portfolio Optimization Platform

EMH-based portfolio optimization system for advisors with two core features: new portfolio creation and existing portfolio analysis via PDF import.

## 🚀 Features

- **New Portfolio Creation**: Define risk profile, select funds, and optimize using Modern Portfolio Theory
- **Existing Portfolio Analysis**: Upload CAS PDF, extract holdings, and compare current vs optimized allocation
- **Real-time Optimization**: Interactive sliders for volatility, return expectations, and weight constraints
- **Comprehensive Analytics**: Sharpe ratio, Sortino ratio, Beta, Maximum Drawdown, and more
- **Efficient Frontier Visualization**: Interactive charts showing optimal risk-return tradeoffs

## 🛠️ Tech Stack

### Backend

- **Framework**: FastAPI
- **Optimization**: CVXPY, NumPy, Pandas, SciPy
- **Database**: PostgreSQL
- **Cache/Queue**: Redis + Celery
- **PDF Processing**: pdfplumber, pytesseract

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS
- **Charts**: ECharts
- **State Management**: React Hooks
- **WebSocket**: Socket.IO

## 📦 Installation

### Prerequisites

- Docker & Docker Compose
- Python 3.11+ (for local development)
- Node.js 20+ (for local development)

### Quick Start with Docker

1. Clone the repository:

```bash
git clone <repository-url>
cd Mf
```

1. Create environment file:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

1. Start all services:

```bash
docker-compose up -d
```

1. Access the application:

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:8000>
- API Documentation: <http://localhost:8000/api/docs>

### Local Development Setup

#### Backend Setup

1. Create virtual environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

1. Install dependencies:

```bash
pip install -r requirements.txt
```

1. Set up database:

```bash
# Start PostgreSQL and Redis (via Docker or locally)
docker-compose up -d postgres redis

# Run migrations (to be added with Alembic)
# alembic upgrade head
```

1. Run development server:

```bash
python main.py
# Or: uvicorn main:app --reload
```

#### Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

1. Run development server:

```bash
npm run dev
```

## 📚 API Documentation

Once the backend is running, visit:

- Swagger UI: <http://localhost:8000/api/docs>
- ReDoc: <http://localhost:8000/api/redoc>

### Key Endpoints

- `POST /api/intake` - Save client risk profile
- `POST /api/funds/search` - Search fund universe
- `POST /api/optimize` - Run portfolio optimization
- `POST /api/portfolio/upload` - Upload PDF for parsing
- `WS /api/optimize/stream` - WebSocket for real-time updates

## 🗄️ Database Schema

- **funds**: Mutual fund master data
- **navs**: NAV time series
- **benchmarks**: Benchmark indices with TRI
- **clients**: Client risk profiles
- **portfolios**: Portfolio holdings
- **optimizations**: Optimization results

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📊 Optimization Engine

The platform uses **Modern Portfolio Theory (MPT)** with the following algorithms:

1. **Minimum Variance Portfolio (MVP)**: Minimize portfolio variance subject to constraints
2. **Maximum Sharpe Ratio**: Maximize risk-adjusted returns
3. **Efficient Frontier**: Generate 40+ optimal portfolios across risk spectrum

### Key Features

- CAPM-based expected returns (EMH)
- Ledoit-Wolf covariance shrinkage
- Asset class band constraints
- No shorting (non-negative weights)
- Real-time recalculation (< 2 seconds)

## 🔒 Security

- JWT authentication for all endpoints
- PDF virus scanning (ClamAV)
- Input validation with Pydantic
- CORS configuration
- Environment-based secrets

## 📈 Performance Targets

- Optimization (10 funds): < 1 second
- Optimization (50 funds): < 3 seconds
- Efficient frontier (40 points): < 5 seconds
- Frontend chart render: < 300ms
- Slider update → backend recompute: < 2 seconds
- PDF extraction accuracy: 80%+

## 🔄 Recent Updates

### Performance & Stability

- **Memory Optimization**: Backend optimization engine now uses `float32` precision and optimized dataframe handling, reducing memory usage by ~50%.
- **Database Efficiency**: Rewrote NAV fetching logic to bypass ORM overhead for large time-series data.
- **Render Deployment Fix**: Addressed memory limit crashes on Render.com free tier.

### UX Improvements

- **Allocation Visibility**: Fixed an issue where funds with 0% allocation were hidden from results. Now all selected funds are explicitly shown with their weights.
- **Client Context**: Persistent display of client name throughout the fund selection and optimization journey.

## 🚧 Roadmap

### V1.0 (Current)

- [x] Project setup
- [x] Client intake module
- [x] Fund selection module
- [x] Data processing pipeline
- [x] Optimization engine (MVP, Max Sharpe, Efficient Frontier)
- [x] Dashboard visualization
- [x] PDF import & Analysis
- [ ] Portfolio comparison
- [x] Monte Carlo Simulation (Beta)

### V2.0 (Future)

- Black-Litterman model
- Multi-index support
- Live NAV ingestion API
- Tax-loss harvesting
- ESG factor integration

## 📝 License

Proprietary - All rights reserved

## 👥 Contributors

- Development Team

## 📞 Support

For issues and questions, please contact the development team.
