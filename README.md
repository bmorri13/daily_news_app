# 📰 Tech Digest - AI-Powered News Aggregator

A daily news aggregation platform that uses AI (Claude) to fetch, analyze, summarize, and tag articles from RSS feeds across Cyber Security, AI, Cloud Engineering, and Cryptocurrency.

![Tech Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude_AI-8B5CF6?style=flat&logo=anthropic&logoColor=white)

## ✨ Features

- **📡 RSS Feed Aggregation**: Automatically fetches articles from 20+ curated tech news sources
- **🤖 AI-Powered Analysis**: Uses Claude AI to generate summaries, tags, sentiment analysis, and relevance scores
- **📊 Daily Digest**: Curates the top 5 articles per category each day
- **📅 Historical Archive**: Browse past digests by date
- **🎨 Modern UI**: Beautiful dark-themed card-based interface
- **🐳 Dockerized**: Easy deployment with Docker Compose

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│    Frontend     │     Backend     │       Scheduler         │
│   (Next.js)     │    (FastAPI)    │     (APScheduler)       │
│   Port: 3000    │   Port: 8000    │                         │
└────────┬────────┴────────┬────────┴────────────┬────────────┘
         │                 │                      │
         │                 ▼                      │
         │         ┌──────────────┐               │
         └────────►│   SQLite DB  │◄──────────────┘
                   │  (./data/)   │
                   └──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Setup

1. **Clone and navigate to the project:**
   ```bash
   cd news-aggregator
   ```

2. **Create your environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Add your Anthropic API key to `.env`:**
   ```env
   ANTHROPIC_API_KEY=your_api_key_here
   ```

4. **Start the services:**
   ```bash
   docker-compose up --build
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### First Run

On first start, click the "Refresh" button in the UI to trigger an initial fetch. This will:
1. Fetch articles from all configured RSS feeds
2. Process them with Claude AI for summaries and tags
3. Select the top 5 articles per category for today's digest

## 📁 Project Structure

```
news-aggregator/
├── docker-compose.yml      # Docker orchestration
├── .env.example            # Environment template
├── .env                    # Your environment variables
├── data/                   # SQLite database (persisted)
│
├── backend/                # FastAPI Backend
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py         # FastAPI application
│       ├── models.py       # SQLAlchemy models
│       ├── schemas.py      # Pydantic schemas
│       ├── database.py     # Database setup
│       ├── config.py       # Configuration & RSS sources
│       ├── rss_fetcher.py  # RSS fetching logic
│       ├── ai_processor.py # Claude AI processing
│       └── scheduler.py    # APScheduler for daily jobs
│
└── frontend/               # Next.js Frontend
    ├── Dockerfile
    ├── package.json
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── globals.css
    ├── components/
    │   ├── ArticleCard.tsx
    │   ├── CategorySection.tsx
    │   ├── Header.tsx
    │   ├── StatsPanel.tsx
    │   ├── EmptyState.tsx
    │   └── LoadingSkeleton.tsx
    └── lib/
        └── api.ts          # API client utilities
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/digest` | GET | Get daily digest (optional `?target_date=YYYY-MM-DD`) |
| `/api/digest/dates` | GET | Get available archive dates |
| `/api/articles` | GET | List articles with filters |
| `/api/articles/{id}` | GET | Get single article |
| `/api/categories/{category}` | GET | Get articles by category |
| `/api/sources` | GET | List RSS sources |
| `/api/stats` | GET | Get aggregation statistics |
| `/api/fetch/trigger` | POST | Manually trigger fetch |
| `/api/fetch/logs` | GET | Get fetch operation logs |

## 📡 Configured RSS Sources

### Cyber Security
- The Hacker News
- Bleeping Computer
- Krebs on Security
- Dark Reading
- SecurityWeek

### Artificial Intelligence
- TechCrunch AI
- MIT Technology Review
- VentureBeat AI
- AI News
- The Verge AI

### Cloud Engineering
- AWS Blog
- Google Cloud Blog
- Azure Blog
- InfoQ Cloud
- The New Stack

### Cryptocurrency
- CoinTelegraph
- Decrypt
- Bitcoin Magazine
- CoinDesk
- The Block

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Claude API key | Required |
| `DATABASE_URL` | Database connection string | `sqlite:///./data/news.db` |
| `ARTICLES_PER_CATEGORY` | Articles to feature per category | `5` |
| `FETCH_SCHEDULE_HOURS` | Hours between scheduled fetches | `24` |

### Adding New RSS Sources

Edit `backend/app/config.py` and add sources to the `RSS_SOURCES` dictionary:

```python
RSS_SOURCES = {
    "cyber": [
        {
            "name": "New Source Name",
            "url": "https://example.com",
            "feed_url": "https://example.com/feed.xml"
        },
        # ... more sources
    ],
    # ... other categories
}
```

## 🔄 Migrating to PostgreSQL

When ready to scale, update your `.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/news_aggregator
```

Add PostgreSQL to `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: news_aggregator
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Update backend to depend on db and change the DATABASE_URL.

## 🛠️ Development

### Running without Docker

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Running the Scheduler Manually

```bash
cd backend
python -m app.scheduler
```

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

---

Built with ❤️ using FastAPI, Next.js, and Claude AI
