"""JSON logging to stdout.

Each line is one JSON object, which the homelab collector ships to Splunk via
Cribl. Every record has `event` (a stable name to search and route on, e.g.
`llm_call`, `http_request`, `job_completed`) plus whatever fields the caller
passes to `log_event`.

Never pass secrets (API keys, DATABASE_URL, the admin token) or prompt and
article bodies as fields.
"""
import json
import logging
import os
import sys
from datetime import datetime, timezone

SERVICE = "daily-news-backend"

# Attributes every LogRecord has; anything else on a record came from `extra`.
# uvicorn adds color_message, a copy of the message with ANSI colour codes.
_RECORD_ATTRS = set(vars(logging.makeLogRecord({}))) | {"message", "asctime", "taskName", "color_message"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "time": datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname.lower(),
            "service": SERVICE,
            "logger": record.name,
            "event": getattr(record, "event", None) or "log",
            "message": record.getMessage(),
        }
        for key, value in vars(record).items():
            if key not in _RECORD_ATTRS and key not in entry and value is not None:
                entry[key] = value
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


def configure_logging() -> None:
    """Send all logging, uvicorn's included, to stdout as JSON."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())

    # uvicorn installs its own plain-text handlers before importing the app;
    # hand its records to the root logger instead.
    for name in ("uvicorn", "uvicorn.error"):
        uv = logging.getLogger(name)
        uv.handlers.clear()
        uv.propagate = True
    # The request middleware in main.py logs each request with the real client
    # IP, so uvicorn's access log (which only sees the frontend container) is off.
    access = logging.getLogger("uvicorn.access")
    access.handlers.clear()
    access.propagate = False
    access.disabled = True

    # httpx logs every request at INFO, including each Claude API call, and
    # APScheduler's job-store chatter duplicates the job_* events. Their
    # warnings (e.g. a missed run) still come through.
    for name in ("httpx", "httpcore", "apscheduler"):
        logging.getLogger(name).setLevel(logging.WARNING)


def log_event(logger: logging.Logger, event: str, message: str = "", level: int = logging.INFO, **fields) -> None:
    """Log a structured event. Field names must not clash with LogRecord attributes."""
    logger.log(level, message or event, extra={"event": event, **fields})
