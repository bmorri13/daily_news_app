# 📰 Tech Digest - AI-Powered News Aggregator

A daily news aggregation platform that uses AI (Claude) to fetch, analyze, summarize, and tag articles from RSS feeds across Cyber Security, AI, Cloud Engineering, and Cryptocurrency. Features include curated daily digests and AI-summarized cybersecurity newsletters.

![Tech Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat&logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude_AI-8B5CF6?style=flat&logo=anthropic&logoColor=white)

## ✨ Features

- **📡 RSS Feed Aggregation**: Automatically fetches articles from 20+ curated tech news sources
- **🤖 AI-Powered Analysis**: Uses Claude AI to generate summaries, tags, sentiment analysis, and relevance scores
- **📊 Daily Digest**: Curates the top 5 articles per category each day
- **📰 Newsletter Digest**: Fetches and summarizes the tl;dr sec cybersecurity newsletter with AI executive summaries
- **📅 Historical Archive**: Browse past digests by date
- **🎨 Modern UI**: Beautiful dark-themed card-based interface
- **🐳 Dockerized**: Easy deployment with Docker Compose
- **⏰ Automated Scheduling**: pg_cron-based scheduling for daily fetches

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Docker Compose                                │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│   Frontend   │   Backend    │  Supabase DB │   Supabase Studio      │
│  (Next.js)   │  (FastAPI)   │ (PostgreSQL) │    (DB Web UI)         │
│  Port: 3000  │  Port: 8000  │  Port: 5432  │    Port: 3001          │
├──────────────┴──────────────┴──────────────┴────────────────────────┤
│                    Cloudflare Tunnel (Optional)                      │
│                      External Access to Site                         │
└──────────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Setup

1. **Clone and navigate to the project:**
   ```bash
   cd daily_news_app
   ```

2. **Create your environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure your `.env` file:**
   ```env
   ANTHROPIC_API_KEY=your_api_key_here
   POSTGRES_PASSWORD=your_db_password
   CF_TOKEN=your_cloudflare_tunnel_token  # Optional, for external access
   ```

4. **Start the services:**
   ```bash
   docker-compose up --build
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Supabase Studio: http://localhost:3001

### First Run

On first start, click the "Refresh" button in the UI to trigger an initial fetch. This will:
1. Fetch articles from all configured RSS feeds
2. Process them with Claude AI for summaries and tags
3. Select the top 5 articles per category for today's digest

## 📁 Project Structure

```
daily_news_app/
├── docker-compose.yml      # Docker orchestration
├── .env.example            # Environment template
├── .env                    # Your environment variables
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
│       └── ai_processor.py # Claude AI processing
│
├── frontend/               # Next.js Frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ArticleCard.tsx
│   │   ├── CategorySection.tsx
│   │   ├── Header.tsx
│   │   ├── StatsPanel.tsx
│   │   ├── EmptyState.tsx
│   │   └── LoadingSkeleton.tsx
│   └── lib/
│       └── api.ts          # API client utilities
│
└── supabase/               # Database initialization
    └── init/
        ├── 00_create_user.sh    # Creates database user
        ├── 01_extensions.sql    # Enables pg_cron and pg_net
        └── 02_scheduler.sql     # Sets up daily cron jobs
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
| `/api/newsletter/latest` | GET | Get latest tl;dr sec newsletter |
| `/api/newsletter/trigger` | POST | Fetch and process newsletter |

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

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Claude API key | Yes |
| `POSTGRES_PASSWORD` | Database password | Yes |
| `CF_TOKEN` | Cloudflare Tunnel token for external access | No |
| `ARTICLES_PER_CATEGORY` | Articles to feature per category (default: 5) | No |

### Scheduler (pg_cron)

The application uses PostgreSQL's pg_cron extension for automated scheduling:

- **RSS Feed Fetch**: Runs daily at 12:00 UTC
- **Newsletter Fetch**: Runs daily at 12:05 UTC

Scheduler configuration is defined in `supabase/init/02_scheduler.sql`. The pg_cron jobs use the pg_net extension to make HTTP POST requests to the backend API endpoints.

To manually trigger fetches:
- Use the "Refresh" button in the UI
- Or call the API: `curl -X POST http://localhost:8000/api/fetch/trigger`

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

Sources are automatically synchronized to the database on backend startup.

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

## 🌐 Production

The application is live at: https://news.bmosan.com/

Deployed via GitHub Actions with automatic builds on push to main.

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

---

Built with FastAPI, Next.js, PostgreSQL, and Claude AI
