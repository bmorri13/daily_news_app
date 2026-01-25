-- Function to trigger the daily fetch via HTTP
CREATE OR REPLACE FUNCTION trigger_daily_fetch()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Call FastAPI's fetch trigger endpoint
    PERFORM net.http_post(
        url := 'http://backend:8000/api/fetch/trigger',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
END;
$$;

-- Schedule daily at 6:00 AM UTC
SELECT cron.schedule(
    'daily-news-fetch',
    '0 6 * * *',
    'SELECT trigger_daily_fetch()'
);
